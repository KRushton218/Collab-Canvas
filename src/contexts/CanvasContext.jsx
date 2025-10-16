import { createContext, useState, useRef, useEffect, useContext, useMemo } from 'react';
import { MIN_ZOOM, MAX_ZOOM, INITIAL_CANVAS_X, INITIAL_CANVAS_Y } from '../utils/constants';
import { AuthContext } from './AuthContext';
import * as shapeService from '../services/shapes';
import * as realtimeShapes from '../services/realtimeShapes';

export const CanvasContext = createContext();

export const CanvasProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  
  // Separate state for Firestore (persistent) and RTDB (temporary) data
  const [firestoreShapes, setFirestoreShapes] = useState([]);
  const [activeEdits, setActiveEdits] = useState({});
  const [locks, setLocks] = useState({});
  
  // Multi-selection support (Set of shape IDs)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ 
    x: window.innerWidth / 2 - INITIAL_CANVAS_X, 
    y: window.innerHeight / 2 - INITIAL_CANVAS_Y 
  });
  const [loading, setLoading] = useState(true);
  const stageRef = useRef(null);

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
      setLocks({});
      return;
    }

    const unsubscribe = realtimeShapes.subscribeToLocks((lockData) => {
      setLocks(lockData);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Merge Firestore shapes with RTDB active edits using useMemo
  // This prevents unnecessary re-renders and only recomputes when dependencies actually change
  const shapes = useMemo(() => {
    return firestoreShapes.map((shape) => {
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
  }, [firestoreShapes, activeEdits, locks, currentUser]);

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
      const newShapeId = await shapeService.createShape({
        ...shapeData,
        createdBy: currentUser.uid,
      });
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
      await shapeService.updateShape(id, updates);
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
        }
      }

      // Prepare RTDB active edits for all shapes (function will validate locks)
      const result = await realtimeShapes.startEditingMultipleShapes(
        ids,
        currentUser.uid,
        initialStates
      );

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
      // STEP 1: Send ALL final updates to RTDB in ONE batched write
      // This is much more efficient than individual writes (1 write instead of N)
      const batchUpdates = {};
      for (const id of ids) {
        const finalState = finalStates[id];
        if (finalState &&
            typeof finalState.x === 'number' &&
            typeof finalState.y === 'number' &&
            typeof finalState.width === 'number' &&
            typeof finalState.height === 'number') {
          batchUpdates[id] = finalState;
        }
      }
      
      if (Object.keys(batchUpdates).length > 0) {
        await realtimeShapes.updateEditingShapesBatch(batchUpdates, true);
      }
      
      // STEP 2: Commit all shapes to Firestore in parallel
      const updatePromises = ids.map(async (id) => {
        const finalState = finalStates[id];
        if (finalState &&
            typeof finalState.x === 'number' &&
            typeof finalState.y === 'number' &&
            typeof finalState.width === 'number' &&
            typeof finalState.height === 'number') {
          
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
          
          await shapeService.updateShape(id, updatePayload);
        }
      });

      // Wait for all Firestore writes to complete
      await Promise.all(updatePromises);
      
      // STEP 3: Wait for Firestore to propagate to other clients
      // Prevents ghost shapes - ensures all clients see Firestore data before RTDB clears
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // STEP 4: Clear active edits for shapes still selected; release locks for deselected
      const stillSelected = new Set(Array.from(selectedIds));
      const toKeepLocked = ids.filter(id => stillSelected.has(id));
      const toRelease = ids.filter(id => !stillSelected.has(id));
      if (toKeepLocked.length > 0) {
        await realtimeShapes.clearActiveEdits(toKeepLocked);
      }
      if (toRelease.length > 0) {
        await realtimeShapes.finishEditingMultipleShapes(toRelease, currentUser.uid);
      }
    } catch (error) {
      console.error('Error finishing multi-shape edit:', error);
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

        // Wait for Firestore write to complete
        await shapeService.updateShape(id, updatePayload);
        
        // STEP 3: Wait for Firestore to propagate to other clients
        // This prevents ghost shapes where RTDB clears before Firestore syncs
        // 400ms is conservative but ensures reliable sync across clients
        await new Promise(resolve => setTimeout(resolve, 400));
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

      await shapeService.deleteShape(id);
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
    const acquired = await realtimeShapes.acquireLock(id, currentUser.uid);
    if (acquired) {
      // release locks for any previously selected shapes that are not this one
      if (selectedIds.size > 0) {
        const prev = Array.from(selectedIds).filter(sid => sid !== id);
        if (prev.length > 0) {
          realtimeShapes.releaseLocks(prev, currentUser.uid).catch(() => {});
        }
      }
      const shape = firestoreShapes.find((s) => s.id === id);
      if (shape) {
        console.log(`[SELECT] ${shape.type}`, { id: shape.id, x: shape.x, y: shape.y, type: shape.type });
      }
      setSelectedIds(new Set([id]));
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
    const { acquired } = await realtimeShapes.acquireLocks(candidates, currentUser.uid);
    // Release locks that were previously selected but not in acquired
    const toRelease = Array.from(selectedIds).filter(id => !acquired.includes(id));
    if (toRelease.length > 0) {
      realtimeShapes.releaseLocks(toRelease, currentUser.uid).catch(() => {});
    }
    const selectedShapes = acquired.map(id => firestoreShapes.find((s) => s.id === id)).filter(Boolean);
    console.log(`[SELECT] ${selectedShapes.length} shapes`, selectedShapes.map(s => ({ id: s.id, x: s.x, y: s.y, type: s.type })));
    setSelectedIds(new Set(acquired));
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
    if (currentUser && selectedIds.size > 0) {
      const idsToRelease = Array.from(selectedIds);
      const deselectedShapes = idsToRelease.map(id => firestoreShapes.find((s) => s.id === id)).filter(Boolean);
      console.log(`[DESELECT] Cleared ${deselectedShapes.length} shapes`, deselectedShapes.map(s => ({ id: s.id, x: s.x, y: s.y, type: s.type })));
      realtimeShapes.releaseLocks(idsToRelease, currentUser.uid).catch(() => {});
    }
    setSelectedIds(new Set());
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
    currentUser,
    locks, // Expose locks for checking lock state
    // Tool state
    activeTool,
    setActiveTool,
    currentFill,
    setCurrentFill,
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
};

