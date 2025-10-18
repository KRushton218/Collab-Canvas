import { createContext, useState, useRef, useEffect, useContext, useMemo } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CANVAS_ID, MIN_ZOOM, MAX_ZOOM, INITIAL_CANVAS_X, INITIAL_CANVAS_Y } from '../utils/constants';
import { AuthContext } from './AuthContext';
import * as shapeService from '../services/shapes';
import * as realtimeShapes from '../services/realtimeShapes';

export const CanvasContext = createContext();

export const CanvasProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  
  // Separate state for Firestore (persistent) and RTDB (temporary) data
  const [firestoreShapes, setFirestoreShapes] = useState([]);
  const [optimisticShapes, setOptimisticShapes] = useState([]); // Shapes shown immediately before Firestore confirms
  const [activeEdits, setActiveEdits] = useState({});
  const [rtdbLocks, setRtdbLocks] = useState({}); // Locks from RTDB
  const [optimisticLocks, setOptimisticLocks] = useState({}); // Local locks (instant UI feedback)
  
  // Merge RTDB locks with optimistic locks
  const locks = useMemo(() => {
    return { ...rtdbLocks, ...optimisticLocks };
  }, [rtdbLocks, optimisticLocks]);
  
  // Multi-selection support (Set of shape IDs)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ 
    x: window.innerWidth / 2 - INITIAL_CANVAS_X, 
    y: window.innerHeight / 2 - INITIAL_CANVAS_Y 
  });
  const [loading, setLoading] = useState(true);
  const [batchOperationLoading, setBatchOperationLoading] = useState(false);
  const [batchOperationProgress, setBatchOperationProgress] = useState({ current: 0, total: 0, operation: '' });
  const stageRef = useRef(null);
  const editSessionStartRef = useRef(new Map());

  // Tool state (used by toolbar and canvas interactions)
  const [activeTool, setActiveTool] = useState('select');
  const [currentFill, setCurrentFill] = useState('#6366f1');

  // Subscribe to Firestore shapes (persistent data)
  useEffect(() => {
    if (!currentUser) {
      setFirestoreShapes([]);
      setLoading(false);
      return;
    }

    let unsubscribe;

    const initializeCanvas = async () => {
      try {
        // Load initial shapes
        const initialShapes = await shapeService.loadShapes();
        setFirestoreShapes(initialShapes);

        // Subscribe to real-time Firestore updates
        unsubscribe = shapeService.subscribeToShapes((updatedShapes) => {
          setFirestoreShapes(updatedShapes);
        });

        setLoading(false);
      } catch (error) {
        console.error('Error initializing canvas:', error);
        setLoading(false);
      }
    };

    initializeCanvas();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Subscribe to RTDB active edits (temporary data during drag/resize)
  useEffect(() => {
    if (!currentUser) {
      setActiveEdits({});
      return;
    }

    const unsubscribe = realtimeShapes.subscribeToActiveEdits((edits) => {
      setActiveEdits(edits);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Subscribe to RTDB locks
  useEffect(() => {
    if (!currentUser) {
      setRtdbLocks({});
      return;
    }

    const unsubscribe = realtimeShapes.subscribeToLocks((lockData) => {
      setRtdbLocks(lockData);
      
      // Clear optimistic locks that have been confirmed in RTDB
      setOptimisticLocks(prev => {
        const confirmed = {};
        for (const [id, lock] of Object.entries(prev)) {
          if (!lockData[id]) {
            // Lock not yet in RTDB, keep optimistic
            confirmed[id] = lock;
          }
          // Otherwise RTDB has it, remove optimistic
        }
        return confirmed;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Merge Firestore shapes with RTDB active edits AND optimistic shapes using useMemo
  // This prevents unnecessary re-renders and only recomputes when dependencies actually change
  const mergedShapes = useMemo(() => {
    // Start with Firestore shapes
    const baseShapes = firestoreShapes.map((shape) => {
      const activeEdit = activeEdits[shape.id];
      const lock = locks[shape.id];
      const lockOwner = lock?.lockedBy || null;
      
      // If shape is being actively edited by ANOTHER user, show their real-time updates
      if (activeEdit && activeEdit.lockedBy !== currentUser?.uid) {
        // Check if values have actually changed to avoid creating new objects unnecessarily
        const xChanged = activeEdit.x !== undefined && activeEdit.x !== shape.x;
        const yChanged = activeEdit.y !== undefined && activeEdit.y !== shape.y;
        const widthChanged = activeEdit.width !== undefined && activeEdit.width !== shape.width;
        const heightChanged = activeEdit.height !== undefined && activeEdit.height !== shape.height;
        const rotationChanged = activeEdit.rotation !== undefined && activeEdit.rotation !== shape.rotation;
        const fontSizeChanged = activeEdit.fontSize !== undefined && activeEdit.fontSize !== shape.fontSize;
        const lockedByChanged = shape.lockedBy !== activeEdit.lockedBy;
        
        // If nothing has changed, return the original object (preserves reference equality)
        if (!xChanged && !yChanged && !widthChanged && !heightChanged && 
            !rotationChanged && !fontSizeChanged && !lockedByChanged) {
          return shape;
        }
        
        // Only create new object if something actually changed
        return {
          ...shape,
          x: activeEdit.x !== undefined ? activeEdit.x : shape.x,
          y: activeEdit.y !== undefined ? activeEdit.y : shape.y,
          width: activeEdit.width !== undefined ? activeEdit.width : shape.width,
          height: activeEdit.height !== undefined ? activeEdit.height : shape.height,
          rotation: activeEdit.rotation !== undefined ? activeEdit.rotation : shape.rotation,
          fontSize: activeEdit.fontSize !== undefined ? activeEdit.fontSize : shape.fontSize,
          lockedBy: activeEdit.lockedBy || null,
        };
      }
      
      // If being edited by current user, DON'T apply RTDB updates
      // (Konva handles local drag, RTDB updates would cause hitching)
      // Just show the lock state if it changed
      if (shape.lockedBy === lockOwner) {
        return shape; // No change, preserve reference
      }
      
      // Lock state changed, create new object
      return {
        ...shape,
        lockedBy: lockOwner,
      };
    });
    
    // Add optimistic shapes (shown immediately before Firestore confirms)
    // Filter out any optimistic shapes that have been confirmed in Firestore
    const confirmedIds = new Set(firestoreShapes.map(s => s.id));
    const pendingOptimistic = optimisticShapes.filter(s => !confirmedIds.has(s.id));
    
    return [...baseShapes, ...pendingOptimistic];
  }, [firestoreShapes, optimisticShapes, activeEdits, locks, currentUser]);
  
  // Sort shapes by zIndex (ascending = bottom to top rendering order)
  const shapes = useMemo(() => {
    return [...mergedShapes].sort((a, b) => {
      const aZ = a.zIndex ?? 0;
      const bZ = b.zIndex ?? 0;
      return aZ - bZ;
    });
  }, [mergedShapes]);

  // Set up disconnect handler to cleanup RTDB data when user leaves
  useEffect(() => {
    if (!currentUser) return;

    const cleanup = realtimeShapes.setupDisconnectCleanup(currentUser.uid);

    return () => {
      cleanup();
    };
  }, [currentUser]);

  // Add a new shape
  const addShape = async (shapeData) => {
    if (!currentUser) {
      console.error('Must be logged in to add shapes');
      return null;
    }

    try {
      // Include user ID in shape data
      const fullShapeData = {
        ...shapeData,
        createdBy: currentUser.uid,
      };
      const newShapeId = await shapeService.createShape(fullShapeData);
      
      // Record in undo history with complete shape data (including assigned ID)
      if (newShapeId) {
        recordEdit(newShapeId, null, { ...fullShapeData, id: newShapeId }, 'CREATE');
      }
      
      return newShapeId;
    } catch (error) {
      console.error('Error adding shape:', error);
      return null;
    }
  };

  // Update an existing shape in Firestore (for final committed changes)
  const updateShape = async (id, updates) => {
    if (!currentUser) {
      console.error('Must be logged in to update shapes');
      return;
    }

    try {
      // Get current state before updating (for undo)
      const shapeBefore = firestoreShapes.find(s => s.id === id);
      
      await shapeService.updateShape(id, updates);
      
      // Record in undo history (only track significant changes)
      if (shapeBefore) {
        // Extract only the changed fields for cleaner history
        const beforeState = {};
        const afterState = {};
        for (const key in updates) {
          beforeState[key] = shapeBefore[key];
          afterState[key] = updates[key];
        }
        recordEdit(id, beforeState, afterState, 'UPDATE');
      }
    } catch (error) {
      console.error('Error updating shape:', error);
    }
  };

  // Update shape temporarily in RTDB (during drag/resize)
  const updateShapeTemporary = async (id, updates) => {
    if (!currentUser) {
      console.error('Must be logged in to update shapes');
      return;
    }

    try {
      await realtimeShapes.updateEditingShape(id, updates);
    } catch (error) {
      console.error('Error updating shape temporarily:', error);
    }
  };

  // Update multiple shapes temporarily in RTDB (during multi-drag/resize) - BATCHED
  const updateShapesTemporaryBatch = async (updates) => {
    if (!currentUser) {
      console.error('Must be logged in to update shapes');
      return;
    }

    try {
      await realtimeShapes.updateEditingShapesBatch(updates);
    } catch (error) {
      console.error('Error batch updating shapes temporarily:', error);
    }
  };

  // Start editing a shape (prepare RTDB active edit; lock is expected from selection)
  const startEditingShape = async (id) => {
    if (!currentUser || !id) {
      return false;
    }

    try {
      // Get the current shape state from Firestore
      const shape = firestoreShapes.find((s) => s.id === id);
      if (!shape) {
        console.error('Shape not found');
        return false;
      }

      // Ensure not locked by someone else (selection flow should already prevent this)
      const existingLock = locks[id];
      if (existingLock && existingLock.lockedBy !== currentUser.uid) {
        console.warn('Shape is locked by another user');
        return false;
      }

      // Start editing (create/ensure RTDB active edit)
      const success = await realtimeShapes.startEditingShape(id, currentUser.uid, {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      });

      if (success) {
        editSessionStartRef.current.set(id, { ...shape });
      } else {
        editSessionStartRef.current.delete(id);
      }

      return success;
    } catch (error) {
      console.error('Error starting shape edit:', error);
      return false;
    }
  };

  // Start editing multiple shapes (for multi-selection transforms). Locks expected from selection.
  const startEditingMultipleShapes = async (ids) => {
    if (!currentUser || !ids || ids.length === 0) {
      return { success: false, failedShapes: [] };
    }

    try {
      // Get initial states for all shapes
      const initialStates = {};
      for (const id of ids) {
        const shape = firestoreShapes.find((s) => s.id === id);
        if (shape) {
          initialStates[id] = {
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
          };
          editSessionStartRef.current.set(id, { ...shape });
        }
      }

      // Prepare RTDB active edits for all shapes (function will validate locks)
      const result = await realtimeShapes.startEditingMultipleShapes(
        ids,
        currentUser.uid,
        initialStates
      );

      if (!result.success) {
        ids.forEach((shapeId) => {
          editSessionStartRef.current.delete(shapeId);
        });
      }

      return result;
    } catch (error) {
      console.error('Error starting multi-shape edit:', error);
      return { success: false, failedShapes: ids };
    }
  };

  // Finish editing multiple shapes
  const finishEditingMultipleShapes = async (ids, finalStates = {}) => {
    if (!currentUser || !ids || ids.length === 0) {
      return;
    }

    try {
      const rtdbBatchUpdates = {};
      const firestoreBatchUpdates = [];
      const historyEntries = [];
      
      for (const id of ids) {
        const finalState = finalStates[id];
        if (
          finalState &&
          typeof finalState.x === 'number' &&
          typeof finalState.y === 'number' &&
          typeof finalState.width === 'number' &&
          typeof finalState.height === 'number'
        ) {
          rtdbBatchUpdates[id] = finalState;
          
          const updatePayload = {
            x: finalState.x,
            y: finalState.y,
            width: finalState.width,
            height: finalState.height,
          };
          if (finalState.rotation !== undefined) {
            updatePayload.rotation = finalState.rotation;
          }
          if (finalState.fontSize !== undefined) {
            updatePayload.fontSize = finalState.fontSize;
          }

          firestoreBatchUpdates.push({ id, updates: updatePayload });

          const beforeShape = editSessionStartRef.current.get(id) || firestoreShapes.find((s) => s.id === id);
          const entry = buildUpdateEntry(id, updatePayload, beforeShape);
          if (entry) {
            historyEntries.push(entry);
          }
        }
      }
      
      if (Object.keys(rtdbBatchUpdates).length > 0) {
        await realtimeShapes.updateEditingShapesBatch(rtdbBatchUpdates, true);
      }
      
      if (firestoreBatchUpdates.length > 0) {
        await shapeService.batchUpdateShapes(firestoreBatchUpdates);
        if (historyEntries.length > 0) {
          recordBatchEdit(historyEntries, {
            action: historyEntries.length > 1 ? 'BATCH_UPDATE' : 'UPDATE',
            description: historyEntries.length > 1 ? 'Multi-shape transform' : 'Shape transform',
          });
        }
      }
      
      await new Promise((resolve) => setTimeout(resolve, 400));
      
      const stillSelected = new Set(Array.from(selectedIds));
      const toKeepLocked = ids.filter((id) => stillSelected.has(id));
      const toRelease = ids.filter((id) => !stillSelected.has(id));
      if (toKeepLocked.length > 0) {
        await realtimeShapes.clearActiveEdits(toKeepLocked);
      }
      if (toRelease.length > 0) {
        await realtimeShapes.finishEditingMultipleShapes(toRelease, currentUser.uid);
      }
    } catch (error) {
      console.error('Error finishing multi-shape edit:', error);
    } finally {
      ids.forEach((id) => editSessionStartRef.current.delete(id));
    }
  };

  // Finish editing a shape (commit to Firestore and clear from RTDB)
  const finishEditingShape = async (id, finalState = null) => {
    if (!currentUser || !id) {
      return;
    }

    try {
      // Get the final state - either from parameter or active edits
      const stateToCommit = finalState || activeEdits[id];
      
      // Only commit if we have valid data (all values defined and numeric)
      if (stateToCommit && 
          typeof stateToCommit.x === 'number' && 
          typeof stateToCommit.y === 'number' &&
          typeof stateToCommit.width === 'number' &&
          typeof stateToCommit.height === 'number') {
        
        // STEP 1: Send final update to RTDB (forceUpdate=true bypasses throttle)
        // This ensures other users see the final position immediately
        await realtimeShapes.updateEditingShape(id, stateToCommit, true);
        
        // STEP 2: Commit to Firestore (persistent storage)
        const updatePayload = {
          x: stateToCommit.x,
          y: stateToCommit.y,
          width: stateToCommit.width,
          height: stateToCommit.height,
        };
        if (stateToCommit.rotation !== undefined) {
          updatePayload.rotation = stateToCommit.rotation;
        }
        if (stateToCommit.fontSize !== undefined) {
          updatePayload.fontSize = stateToCommit.fontSize;
        }

        const beforeShape = editSessionStartRef.current.get(id) || firestoreShapes.find((s) => s.id === id);
        const historyEntry = buildUpdateEntry(id, updatePayload, beforeShape);

        await shapeService.updateShape(id, updatePayload);

        if (historyEntry) {
          recordBatchEdit([historyEntry], {
            action: 'UPDATE',
            description: 'Shape transform',
          });
        }
        
        await new Promise((resolve) => setTimeout(resolve, 400));
      } else {
        console.warn('Skipping Firestore commit - invalid or incomplete shape data', { id, stateToCommit });
      }

      // STEP 4: Clear RTDB and keep/release lock based on selection state
      const stillSelected = selectedIds.has(id);
      if (stillSelected) {
        await realtimeShapes.clearActiveEdit(id);
      } else {
        await realtimeShapes.finishEditingShape(id, currentUser.uid);
      }
    } catch (error) {
      console.error('Error finishing shape edit:', error);
    } finally {
      editSessionStartRef.current.delete(id);
    }
  };

  // Delete a shape
  const deleteShape = async (id) => {
    if (!currentUser) {
      console.error('Must be logged in to delete shapes');
      return;
    }

    try {
      // Check if the shape is locked by another user
      if (shapeService.isShapeLockedByOther(locks, id, currentUser.uid)) {
        console.warn('Cannot delete shape locked by another user');
        return;
      }

      // Get shape state before deleting (for undo)
      const shapeBefore = firestoreShapes.find(s => s.id === id);
      
      // Clean up RTDB state (in case shape was being edited)
      await realtimeShapes.clearActiveEdit(id);
      
      await shapeService.deleteShape(id);
      
      // Record in undo history
      if (shapeBefore) {
        recordEdit(id, shapeBefore, null, 'DELETE');
      }
      
      if (selectedIds.has(id)) {
        const newSelection = new Set(selectedIds);
        newSelection.delete(id);
        setSelectedIds(newSelection);
      }
    } catch (error) {
      console.error('Error deleting shape:', error);
    }
  };

  // Selection management functions

  // Select a single shape (acquires lock, clears previous selection)
  const selectShape = async (id) => {
    if (!currentUser || !id) return;
    const existingLock = locks[id];
    if (existingLock && existingLock.lockedBy && existingLock.lockedBy !== currentUser.uid) {
      return; // can't select if locked by someone else
    }
    
    // OPTIMISTIC: Update UI immediately (zero lag for local user)
    setSelectedIds(new Set([id]));
    
    // Then acquire lock in background
    const acquired = await realtimeShapes.acquireLock(id, currentUser.uid);
    if (acquired) {
      // Release previous locks in background
      if (selectedIds.size > 0) {
        const prev = Array.from(selectedIds).filter(sid => sid !== id);
        if (prev.length > 0) {
          realtimeShapes.releaseLocks(prev, currentUser.uid).catch(() => {});
        }
      }
    } else {
      // Rollback if lock failed
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Toggle a shape in/out of selection (for Shift+Click / Ctrl+Click)
  const toggleSelection = async (id) => {
    if (!currentUser || !id) return;
    if (selectedIds.has(id)) {
      // Deselect and release lock
      const shape = firestoreShapes.find((s) => s.id === id);
      if (shape) {
        console.log(`[DESELECT] ${shape.type}`, { id: shape.id, x: shape.x, y: shape.y, type: shape.type });
      }
      realtimeShapes.releaseLock(id, currentUser.uid).catch(() => {});
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      const existingLock = locks[id];
      if (existingLock && existingLock.lockedBy && existingLock.lockedBy !== currentUser.uid) {
        return; // can't select if locked by someone else
      }
      const acquired = await realtimeShapes.acquireLock(id, currentUser.uid);
      if (acquired) {
        const shape = firestoreShapes.find((s) => s.id === id);
        if (shape) {
          console.log(`[SELECT] ${shape.type}`, { id: shape.id, x: shape.x, y: shape.y, type: shape.type });
        }
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
    }
  };

  // Select multiple shapes (acquire locks, replaces current selection)
  const selectMultiple = async (ids) => {
    if (!currentUser || !ids || ids.length === 0) return;
    
    // Filter out shapes locked by others
    const candidates = ids.filter((id) => {
      const l = locks[id];
      return !(l && l.lockedBy && l.lockedBy !== currentUser.uid);
    });
    
    // OPTIMISTIC: Update UI immediately (zero lag for local user)
    setSelectedIds(new Set(candidates));
    
    // Add optimistic locks immediately (shows lock borders without waiting for RTDB)
    const optimisticLockUpdates = {};
    for (const id of candidates) {
      optimisticLockUpdates[id] = {
        lockedBy: currentUser.uid,
        lockedAt: Date.now(),
      };
    }
    setOptimisticLocks(optimisticLockUpdates);
    
    // Then acquire locks in background (batched RTDB write)
    const { acquired, failed } = await realtimeShapes.acquireLocks(candidates, currentUser.uid);
    
    // If some locks failed, rollback
    if (failed.length > 0) {
      setSelectedIds(new Set(acquired));
      // Remove failed locks from optimistic
      setOptimisticLocks(prev => {
        const updated = { ...prev };
        for (const id of failed) {
          delete updated[id];
        }
        return updated;
      });
    }
    
    // Release previously selected locks in background
    const toRelease = Array.from(selectedIds).filter(id => !candidates.includes(id));
    if (toRelease.length > 0) {
      // Remove from optimistic locks
      setOptimisticLocks(prev => {
        const updated = { ...prev };
        for (const id of toRelease) {
          delete updated[id];
        }
        return updated;
      });
      // Release in RTDB
      realtimeShapes.releaseLocks(toRelease, currentUser.uid).catch(() => {});
    }
  };

  // Add shapes to current selection (acquire locks)
  const addToSelection = async (ids) => {
    if (!currentUser || !ids || ids.length === 0) return;
    const candidates = ids.filter((id) => !selectedIds.has(id)).filter((id) => {
      const l = locks[id];
      return !(l && l.lockedBy && l.lockedBy !== currentUser.uid);
    });
    const { acquired } = await realtimeShapes.acquireLocks(candidates, currentUser.uid);
    if (acquired.length > 0) {
      const addedShapes = acquired.map(id => firestoreShapes.find((s) => s.id === id)).filter(Boolean);
      console.log(`[SELECT] Added ${addedShapes.length} shapes`, addedShapes.map(s => ({ id: s.id, x: s.x, y: s.y, type: s.type })));
      setSelectedIds(prev => {
        const next = new Set(prev);
        acquired.forEach(id => next.add(id));
        return next;
      });
    }
  };

  // Remove shapes from current selection (release locks)
  const removeFromSelection = async (ids) => {
    if (!currentUser || !ids || ids.length === 0) return;
    const removedShapes = ids.map(id => firestoreShapes.find((s) => s.id === id)).filter(Boolean);
    console.log(`[DESELECT] Removed ${removedShapes.length} shapes`, removedShapes.map(s => ({ id: s.id, x: s.x, y: s.y, type: s.type })));
    realtimeShapes.releaseLocks(ids, currentUser.uid).catch(() => {});
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  };

  // Toggle multiple shapes (for drag selection)
  const toggleMultiple = async (ids) => {
    if (!currentUser || !ids || ids.length === 0) return;
    const toRemove = ids.filter(id => selectedIds.has(id));
    const toAddCandidates = ids.filter(id => !selectedIds.has(id)).filter((id) => {
      const l = locks[id];
      return !(l && l.lockedBy && l.lockedBy !== currentUser.uid);
    });
    if (toRemove.length > 0) {
      realtimeShapes.releaseLocks(toRemove, currentUser.uid).catch(() => {});
    }
    const { acquired } = await realtimeShapes.acquireLocks(toAddCandidates, currentUser.uid);
    const addedShapes = acquired.map(id => firestoreShapes.find((s) => s.id === id)).filter(Boolean);
    const removedShapes = toRemove.map(id => firestoreShapes.find((s) => s.id === id)).filter(Boolean);
    if (addedShapes.length > 0) {
      console.log(`[SELECT] Added ${addedShapes.length} shapes`, addedShapes.map(s => ({ id: s.id, x: s.x, y: s.y, type: s.type })));
    }
    if (removedShapes.length > 0) {
      console.log(`[DESELECT] Removed ${removedShapes.length} shapes`, removedShapes.map(s => ({ id: s.id, x: s.x, y: s.y, type: s.type })));
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      toRemove.forEach(id => next.delete(id));
      acquired.forEach(id => next.add(id));
      return next;
    });
  };

  // Clear all selection (release all locks)
  const deselectAll = async () => {
    // OPTIMISTIC: Clear UI immediately
    setSelectedIds(new Set());
    setOptimisticLocks({});
    
    // Then release locks in RTDB (batched, in background)
    if (currentUser && selectedIds.size > 0) {
      const idsToRelease = Array.from(selectedIds);
      realtimeShapes.releaseLocks(idsToRelease, currentUser.uid).catch(() => {});
    }
  };

  // Backward compatibility: deselect shape
  const deselectShape = deselectAll;

  // Handle zoom with limits
  const handleZoom = (newScale) => {
    const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    setScale(clampedScale);
    return clampedScale;
  };

  // Reset view to center
  const resetView = () => {
    setScale(1);
    setPosition({ 
      x: window.innerWidth / 2 - INITIAL_CANVAS_X, 
      y: window.innerHeight / 2 - INITIAL_CANVAS_Y 
    });
  };

  // ========== UNDO/REDO SYSTEM (Server-State Based) ==========
  const [editHistory, setEditHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const MAX_HISTORY = 50;
  const isUndoRedoOperationRef = useRef(false);
  
  const canUndo = editHistory.length > 0;
  const canRedo = redoStack.length > 0;

  const clearSelectionForShape = (shapeId) => {
    setSelectedIds((prev) => {
      if (!prev.has(shapeId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(shapeId);
      return next;
    });
  };

  const areValuesEqual = (a, b) => {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        if (!areValuesEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      for (const key of aKeys) {
        if (!areValuesEqual(a[key], b[key])) {
          return false;
        }
      }
      return true;
    }
    return false;
  };

  const getSnapshotForShape = (id) => {
    if (editSessionStartRef.current.has(id)) {
      return editSessionStartRef.current.get(id);
    }
    const shape = firestoreShapes.find((s) => s.id === id);
    return shape ? { ...shape } : null;
  };

  const buildUpdateEntry = (id, updatePayload, beforeShapeOverride = null) => {
    const beforeShape = beforeShapeOverride ? { ...beforeShapeOverride } : getSnapshotForShape(id);
    const beforeState = {};
    const afterState = {};
    let hasChanges = false;

    Object.entries(updatePayload).forEach(([key, value]) => {
      const beforeValue = beforeShape ? beforeShape[key] : undefined;
      if (!areValuesEqual(beforeValue, value)) {
        beforeState[key] = beforeValue ?? null;
        afterState[key] = value;
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      return null;
    }

    return {
      shapeId: id,
      action: 'UPDATE',
      beforeState,
      afterState,
    };
  };

  const cloneState = (state) => {
    if (state === undefined || state === null) {
      return null;
    }
    return JSON.parse(JSON.stringify(state));
  };

  const deriveBatchAction = (entries, overrideAction) => {
    if (overrideAction) {
      return overrideAction;
    }
    if (entries.length === 1) {
      return entries[0].action;
    }
    const uniqueActions = Array.from(new Set(entries.map((entry) => entry.action)));
    if (uniqueActions.length === 1) {
      return `BATCH_${uniqueActions[0]}`;
    }
    return 'BATCH';
  };

  const recordBatchEdit = (entries, options = {}) => {
    if (isUndoRedoOperationRef.current) {
      return null;
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return null;
    }

    const sanitizedEntries = entries
      .map((entry) => {
        if (!entry || !entry.shapeId || !entry.action) {
          return null;
        }
        return {
          shapeId: entry.shapeId,
          action: entry.action,
          beforeState: cloneState(entry.beforeState),
          afterState: cloneState(entry.afterState),
        };
      })
      .filter(Boolean);

    if (sanitizedEntries.length === 0) {
      return null;
    }

    const edit = {
      id: `edit-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      userId: currentUser?.uid,
      action: deriveBatchAction(sanitizedEntries, options.action),
      entries: sanitizedEntries,
      description: options.description || null,
    };

    setEditHistory((prev) => {
      const newHistory = [...prev, edit];
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });

    setRedoStack([]);

    console.log(
      `[History] Recorded ${edit.action} (${sanitizedEntries.length} entr${sanitizedEntries.length === 1 ? 'y' : 'ies'})`
    );

    return edit;
  };

  const recordEdit = (shapeId, beforeState, afterState, action) => {
    if (!shapeId || !action) {
      return null;
    }
    return recordBatchEdit(
      [
        {
          shapeId,
          action,
          beforeState,
          afterState,
        },
      ],
      { action }
    );
  };

  const getEntriesFromEdit = (edit) => {
    if (!edit) return [];
    if (Array.isArray(edit.entries) && edit.entries.length > 0) {
      return edit.entries;
    }
    if (edit.action && edit.shapeId) {
      return [
        {
          action: edit.action,
          shapeId: edit.shapeId,
          beforeState: edit.beforeState ?? null,
          afterState: edit.afterState ?? null,
        },
      ];
    }
    return [];
  };

  const applyUndoEntry = async (entry) => {
    switch (entry.action) {
      case 'CREATE': {
        console.log('[Undo] Reverting CREATE for shape', entry.shapeId);
        const shapeExists = firestoreShapes.find((s) => s.id === entry.shapeId);
        if (shapeExists) {
          await shapeService.deleteShape(entry.shapeId);
          clearSelectionForShape(entry.shapeId);
        } else {
          console.warn('[Undo] Shape already deleted by another user:', entry.shapeId);
        }
        break;
      }
      case 'DELETE': {
        console.log('[Undo] Reverting DELETE for shape', entry.shapeId);
        const shapeExists = firestoreShapes.find((s) => s.id === entry.shapeId);
        if (shapeExists) {
          console.warn(
            '[Undo] Cannot undo delete - shape already recreated by another user:',
            entry.shapeId
          );
        } else if (entry.beforeState) {
          const { id, updatedAt, lockedBy, ...shapeData } = entry.beforeState;
          const shapeRef = doc(db, 'shapes', entry.shapeId);
          await setDoc(shapeRef, {
            ...shapeData,
            id: entry.shapeId,
            canvasId: CANVAS_ID,
            createdAt: entry.beforeState.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: entry.beforeState.createdBy || currentUser.uid,
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        break;
      }
      case 'UPDATE': {
        console.log('[Undo] Reverting UPDATE for shape', entry.shapeId);
        const shapeExists = firestoreShapes.find((s) => s.id === entry.shapeId);
        if (shapeExists && entry.beforeState) {
          await shapeService.updateShape(entry.shapeId, entry.beforeState);
        } else if (!shapeExists) {
          console.warn('[Undo] Cannot undo update - shape was deleted:', entry.shapeId);
        }
        break;
      }
      default: {
        console.warn('[Undo] Unknown action type:', entry.action);
      }
    }
  };

  const applyRedoEntry = async (entry) => {
    switch (entry.action) {
      case 'CREATE': {
        console.log('[Redo] Re-applying CREATE for shape', entry.shapeId);
        const shapeExists = firestoreShapes.find((s) => s.id === entry.shapeId);
        if (shapeExists) {
          console.warn('[Redo] Shape already exists:', entry.shapeId);
        } else if (entry.afterState) {
          const { id, updatedAt, lockedBy, ...shapeData } = entry.afterState;
          const shapeRef = doc(db, 'shapes', entry.shapeId);
          await setDoc(shapeRef, {
            ...shapeData,
            id: entry.shapeId,
            canvasId: CANVAS_ID,
            createdAt: entry.afterState.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: entry.afterState.createdBy || currentUser.uid,
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        break;
      }
      case 'DELETE': {
        console.log('[Redo] Re-applying DELETE for shape', entry.shapeId);
        const shapeExists = firestoreShapes.find((s) => s.id === entry.shapeId);
        if (shapeExists) {
          await shapeService.deleteShape(entry.shapeId);
          clearSelectionForShape(entry.shapeId);
        } else {
          console.warn('[Redo] Shape already deleted:', entry.shapeId);
        }
        break;
      }
      case 'UPDATE': {
        console.log('[Redo] Re-applying UPDATE for shape', entry.shapeId);
        const shapeExists = firestoreShapes.find((s) => s.id === entry.shapeId);
        if (shapeExists && entry.afterState) {
          await shapeService.updateShape(entry.shapeId, entry.afterState);
        } else if (!shapeExists) {
          console.warn('[Redo] Cannot redo update - shape was deleted:', entry.shapeId);
        }
        break;
      }
      default: {
        console.warn('[Redo] Unknown action type:', entry.action);
      }
    }
  };

  const undo = async () => {
    if (!canUndo) return;

    const lastEdit = editHistory[editHistory.length - 1];
    const entries = getEntriesFromEdit(lastEdit);

    if (entries.length === 0) {
      setEditHistory((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, lastEdit]);
      return;
    }

    console.log(
      `[Undo] Applying edit ${lastEdit.id} (${lastEdit.action}) with ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`
    );

    isUndoRedoOperationRef.current = true;

    try {
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        await applyUndoEntry(entries[i]);
      }

      setEditHistory((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, lastEdit]);
    } catch (error) {
      console.error('[Undo] Failed:', error);
      setEditHistory((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, lastEdit]);
    } finally {
      isUndoRedoOperationRef.current = false;
    }
  };
  
  const redo = async () => {
    if (!canRedo) return;
    
    const lastUndo = redoStack[redoStack.length - 1];
    const entries = getEntriesFromEdit(lastUndo);

    if (entries.length === 0) {
      setRedoStack((prev) => prev.slice(0, -1));
      setEditHistory((prev) => [...prev, lastUndo]);
      return;
    }

    console.log(
      `[Redo] Applying edit ${lastUndo.id} (${lastUndo.action}) with ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`
    );
    
    isUndoRedoOperationRef.current = true;
    
    try {
      for (const entry of entries) {
        await applyRedoEntry(entry);
      }
      
      setRedoStack((prev) => prev.slice(0, -1));
      setEditHistory((prev) => [...prev, lastUndo]);
    } catch (error) {
      console.error('[Redo] Failed:', error);
      setRedoStack((prev) => prev.slice(0, -1));
      setEditHistory((prev) => [...prev, lastUndo]);
    } finally {
      isUndoRedoOperationRef.current = false;
    }
  };

  // ========== CLIPBOARD SYSTEM ==========
  const [clipboard, setClipboard] = useState(null);
  
  const copySelected = () => {
    if (selectedIds.size === 0) return;
    const selectedShapes = firestoreShapes.filter(s => selectedIds.has(s.id));
    setClipboard(selectedShapes);
    console.log('[Copy] Copied', selectedShapes.length, 'shapes to clipboard');
  };
  
  const pasteFromClipboard = async () => {
    if (!clipboard || clipboard.length === 0) return;
    
    const shapeCount = clipboard.length;
    console.log('[Paste] Pasting', shapeCount, 'shapes');
    
    // Show loading state for large operations
    if (shapeCount > 20) {
      setBatchOperationLoading(true);
      setBatchOperationProgress({ current: 0, total: shapeCount, operation: 'Pasting' });
    }
    
    try {
      // Calculate visible viewport bounds
      const stage = stageRef.current;
      if (!stage) return;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get canvas coordinates for viewport center
      const transform = stage.getAbsoluteTransform().copy().invert();
      const viewportCenter = transform.point({ x: viewportWidth / 2, y: viewportHeight / 2 });
      
      // Calculate bounding box of clipboard shapes
      if (clipboard.length > 0) {
        const xs = clipboard.map(s => s.x);
        const ys = clipboard.map(s => s.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        
        // Calculate offset to center clipboard content at viewport center
        const offsetX = viewportCenter.x - minX - 50; // Small offset so not perfectly centered
        const offsetY = viewportCenter.y - minY - 50;
        
        // Generate IDs immediately for optimistic UI
        const newIds = [];
        const shapesToCreate = clipboard.map(shape => {
          const { id, createdAt, updatedAt, createdBy, lockedBy, ...shapeData } = shape;
          const newId = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          newIds.push(newId);
          return {
            ...shapeData,
            id: newId, // Include ID in the shape
            x: shapeData.x + offsetX,
            y: shapeData.y + offsetY,
            createdBy: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        
        // OPTIMISTIC UI: Show shapes immediately
        setOptimisticShapes(prev => [...prev, ...shapesToCreate]);
        
        // Use batch create for much better performance (1 network call instead of N)
        const confirmedIds = await shapeService.batchCreateShapes(shapesToCreate);
        
        // Clear optimistic shapes (they'll now come from Firestore)
        setOptimisticShapes(prev => prev.filter(s => !confirmedIds.includes(s.id)));
        
        const historyEntries = confirmedIds.map((newId, index) => ({
          shapeId: newId,
          action: 'CREATE',
          beforeState: null,
          afterState: { ...shapesToCreate[index], id: newId },
        })).filter(Boolean);

        if (historyEntries.length > 0) {
          recordBatchEdit(historyEntries, {
            action: historyEntries.length > 1 ? 'BATCH_CREATE' : 'CREATE',
            description: historyEntries.length > 1 ? 'Paste shapes' : 'Paste shape',
          });
        }
        
        // Select the newly pasted shapes
        if (confirmedIds.length > 0) {
          setTimeout(() => selectMultiple(confirmedIds), 100);
        }
      }
    } finally {
      // Clear loading state
      if (shapeCount > 20) {
        setBatchOperationLoading(false);
        setBatchOperationProgress({ current: 0, total: 0, operation: '' });
      }
    }
  };
  
  const duplicateSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const selectedShapes = firestoreShapes.filter(s => selectedIds.has(s.id));
    const shapeCount = selectedShapes.length;
    console.log('[Duplicate] Duplicating', shapeCount, 'shapes');
    
    // Show loading state for large operations
    if (shapeCount > 20) {
      setBatchOperationLoading(true);
      setBatchOperationProgress({ current: 0, total: shapeCount, operation: 'Duplicating' });
    }
    
    try {
      // Smart offset: 20px, but ensure shapes stay in viewport
      const stage = stageRef.current;
      if (!stage) return;
      
      const offset = 20;
      
      // Get viewport bounds in canvas coordinates
      const transform = stage.getAbsoluteTransform().copy().invert();
      const viewportTopLeft = transform.point({ x: 0, y: 0 });
      const viewportBottomRight = transform.point({ 
        x: window.innerWidth, 
        y: window.innerHeight 
      });
      
      // Generate IDs immediately for optimistic UI
      const newIds = [];
      const shapesToCreate = selectedShapes.map(shape => {
        const { id, createdAt, updatedAt, createdBy, lockedBy, ...shapeData } = shape;
        const newId = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        newIds.push(newId);
        
        // Calculate new position with offset
        let newX = shapeData.x + offset;
        let newY = shapeData.y + offset;
        
        // Check if new position would be mostly offscreen
        const shapeWidth = shapeData.width || 100;
        const shapeHeight = shapeData.height || 100;
        
        // If more than 75% would be offscreen, place near viewport center instead
        if (newX + shapeWidth * 0.25 > viewportBottomRight.x ||
            newY + shapeHeight * 0.25 > viewportBottomRight.y ||
            newX + shapeWidth * 0.75 < viewportTopLeft.x ||
            newY + shapeHeight * 0.75 < viewportTopLeft.y) {
          // Place near viewport center with small offset
          const centerX = (viewportTopLeft.x + viewportBottomRight.x) / 2;
          const centerY = (viewportTopLeft.y + viewportBottomRight.y) / 2;
          newX = centerX - shapeWidth / 2 + offset;
          newY = centerY - shapeHeight / 2 + offset;
        }
        
        return {
          ...shapeData,
          id: newId, // Include ID in the shape
          x: newX,
          y: newY,
          createdBy: currentUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
      
      // OPTIMISTIC UI: Show shapes immediately
      setOptimisticShapes(prev => [...prev, ...shapesToCreate]);
      
      // Use batch create for much better performance (1 network call instead of N)
      const confirmedIds = await shapeService.batchCreateShapes(shapesToCreate);
      
      // Clear optimistic shapes (they'll now come from Firestore)
      setOptimisticShapes(prev => prev.filter(s => !confirmedIds.includes(s.id)));
      
      const historyEntries = confirmedIds.map((newId, index) => ({
        shapeId: newId,
        action: 'CREATE',
        beforeState: null,
        afterState: { ...shapesToCreate[index], id: newId },
      })).filter(Boolean);

      if (historyEntries.length > 0) {
        recordBatchEdit(historyEntries, {
          action: historyEntries.length > 1 ? 'BATCH_CREATE' : 'CREATE',
          description: historyEntries.length > 1 ? 'Duplicate shapes' : 'Duplicate shape',
        });
      }
      
      // Select the duplicated shapes
      if (confirmedIds.length > 0) {
        setTimeout(() => selectMultiple(confirmedIds), 100);
      }
    } finally {
      // Clear loading state
      if (shapeCount > 20) {
        setBatchOperationLoading(false);
        setBatchOperationProgress({ current: 0, total: 0, operation: '' });
      }
    }
  };
  
  const hasClipboard = clipboard && clipboard.length > 0;

  // ========== LAYER MANAGEMENT (Z-INDEX) ==========
  const bringToFront = async () => {
    if (selectedIds.size === 0) return;
    
    // Find current max zIndex
    const maxZIndex = Math.max(0, ...firestoreShapes.map(s => s.zIndex ?? 0));
    
    // Get selected shapes and sort by current zIndex to maintain relative order
    const selectedShapeIds = Array.from(selectedIds);
    const selectedShapesData = selectedShapeIds
      .map(id => firestoreShapes.find(s => s.id === id))
      .filter(Boolean)
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    
    // Prepare batch updates
    const batchUpdates = selectedShapesData.map((shape, i) => ({
      id: shape.id,
      updates: {
        zIndex: maxZIndex + 1 + i,
      }
    }));
    const historyEntries = batchUpdates
      .map((update, index) => buildUpdateEntry(update.id, update.updates, selectedShapesData[index]))
      .filter(Boolean);
    
    // Use batch update for much better performance (1 transaction instead of N)
    if (batchUpdates.length > 0) {
      await shapeService.batchUpdateShapes(batchUpdates);
      if (historyEntries.length > 0) {
        recordBatchEdit(historyEntries, {
          action: historyEntries.length > 1 ? 'BATCH_UPDATE' : 'UPDATE',
          description: 'Bring to front',
        });
      }
    }
    
    console.log('[BringToFront] Moved', selectedShapesData.length, 'shapes to front');
  };
  
  const sendToBack = async () => {
    if (selectedIds.size === 0) return;
    
    // Find current min zIndex
    const minZIndex = Math.min(0, ...firestoreShapes.map(s => s.zIndex ?? 0));
    
    // Get selected shapes and sort by current zIndex to maintain relative order
    const selectedShapeIds = Array.from(selectedIds);
    const selectedShapesData = selectedShapeIds
      .map(id => firestoreShapes.find(s => s.id === id))
      .filter(Boolean)
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    
    // Prepare batch updates
    const count = selectedShapesData.length;
    const batchUpdates = selectedShapesData.map((shape, i) => ({
      id: shape.id,
      updates: {
        zIndex: minZIndex - count + i,
      }
    }));
    const historyEntries = batchUpdates
      .map((update, index) => buildUpdateEntry(update.id, update.updates, selectedShapesData[index]))
      .filter(Boolean);
    
    // Use batch update for much better performance (1 transaction instead of N)
    if (batchUpdates.length > 0) {
      await shapeService.batchUpdateShapes(batchUpdates);
      if (historyEntries.length > 0) {
        recordBatchEdit(historyEntries, {
          action: historyEntries.length > 1 ? 'BATCH_UPDATE' : 'UPDATE',
          description: 'Send to back',
        });
      }
    }
    
    console.log('[SendToBack] Moved', selectedShapesData.length, 'shapes to back');
  };

  // ========== ARROW KEY MOVEMENT ==========
  const moveSelectedShapes = async (deltaX, deltaY) => {
    if (selectedIds.size === 0) return;
    
    const idsToMove = Array.from(selectedIds);
    
    // Prepare updates for both RTDB (real-time preview) and Firestore (persistence)
    const rtdbBatchUpdates = {};
    const firestoreBatchUpdates = [];
    const historyEntries = [];
    
    for (const id of idsToMove) {
      const shape = firestoreShapes.find(s => s.id === id);
      if (shape) {
        const newX = shape.x + deltaX;
        const newY = shape.y + deltaY;

        if (shape.x === newX && shape.y === newY) {
          continue;
        }
        
        // RTDB update for real-time preview to other users
        rtdbBatchUpdates[id] = {
          x: newX,
          y: newY,
          width: shape.width,
          height: shape.height,
        };
        
        // Firestore update for persistence
        firestoreBatchUpdates.push({
          id,
          updates: {
            x: newX,
            y: newY,
          }
        });

        const entry = buildUpdateEntry(id, { x: newX, y: newY }, shape);
        if (entry) {
          historyEntries.push(entry);
        }
      }
    }

    if (firestoreBatchUpdates.length === 0) {
      return;
    }
    
    // Send to RTDB first for instant preview to other users
    if (Object.keys(rtdbBatchUpdates).length > 0) {
      await realtimeShapes.updateEditingShapesBatch(rtdbBatchUpdates, true);
    }
    
    // Then commit to Firestore for persistence (1 transaction instead of N)
    if (firestoreBatchUpdates.length > 0) {
      await shapeService.batchUpdateShapes(firestoreBatchUpdates);
      if (historyEntries.length > 0) {
        recordBatchEdit(historyEntries, {
          action: historyEntries.length > 1 ? 'BATCH_UPDATE' : 'UPDATE',
          description: historyEntries.length > 1 ? 'Move selection' : 'Move shape',
        });
      }
    }
    
    // Wait for Firestore propagation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Clear RTDB entries since shapes are now persisted
    if (Object.keys(rtdbBatchUpdates).length > 0) {
      await realtimeShapes.clearActiveEdits(idsToMove);
    }
  };

  // ========== SELECT ALL ==========
  const selectAll = async () => {
    const allShapeIds = firestoreShapes.map(s => s.id);
    await selectMultiple(allShapeIds);
  };

  const value = {
    shapes,
    // Multi-selection state and methods
    selectedIds,
    selectedId: selectedIds.size === 1 ? Array.from(selectedIds)[0] : null, // Backward compatibility
    selectShape,
    toggleSelection,
    selectMultiple,
    addToSelection,
    removeFromSelection,
    toggleMultiple,
    deselectAll,
    deselectShape, // Alias for deselectAll
    setSelectedId: selectShape, // Backward compatibility
    scale,
    setScale: handleZoom,
    position,
    setPosition,
    stageRef,
    addShape,
    updateShape,
    updateShapeTemporary,
    updateShapesTemporaryBatch, // New: batched RTDB updates for multi-selection
    startEditingShape,
    startEditingMultipleShapes, // New: multi-shape locking
    finishEditingShape,
    finishEditingMultipleShapes, // New: multi-shape commit & release
    deleteShape,
    resetView,
    loading,
    batchOperationLoading, // Loading state for large batch operations
    batchOperationProgress, // Progress info for batch operations
    currentUser,
    locks, // Expose locks for checking lock state
    // Tool state
    activeTool,
    setActiveTool,
    currentFill,
    setCurrentFill,
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    editHistory,
    redoStack,
    // Clipboard
    copySelected,
    pasteFromClipboard,
    duplicateSelected,
    hasClipboard,
    clipboard,
    // Layer management
    bringToFront,
    sendToBack,
    // Arrow key movement
    moveSelectedShapes,
    // Select all
    selectAll,
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
};
