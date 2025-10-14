import { createContext, useState, useRef, useEffect, useContext } from 'react';
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
  
  // Merged shapes (Firestore + RTDB overrides)
  const [shapes, setShapes] = useState([]);
  
  const [selectedId, setSelectedId] = useState(null);
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

  // Merge Firestore shapes with RTDB active edits
  useEffect(() => {
    const mergedShapes = firestoreShapes.map((shape) => {
      const activeEdit = activeEdits[shape.id];
      const lock = locks[shape.id];
      
      // If shape is being actively edited by ANOTHER user, show their real-time updates
      if (activeEdit && activeEdit.lockedBy !== currentUser?.uid) {
        return {
          ...shape,
          x: activeEdit.x !== undefined ? activeEdit.x : shape.x,
          y: activeEdit.y !== undefined ? activeEdit.y : shape.y,
          width: activeEdit.width !== undefined ? activeEdit.width : shape.width,
          height: activeEdit.height !== undefined ? activeEdit.height : shape.height,
          lockedBy: activeEdit.lockedBy || null,
        };
      }
      
      // If being edited by current user, DON'T apply RTDB updates
      // (Konva handles local drag, RTDB updates would cause hitching)
      // Just show the lock state
      return {
        ...shape,
        lockedBy: lock?.lockedBy || null,
      };
    });

    setShapes(mergedShapes);
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

  // Start editing a shape (lock and move to RTDB)
  const startEditingShape = async (id) => {
    if (!currentUser || !id) {
      return false;
    }

    try {
      // Finish editing any previously selected shape
      if (selectedId && selectedId !== id) {
        await finishEditingShape(selectedId);
      }

      // Get the current shape state from Firestore
      const shape = firestoreShapes.find((s) => s.id === id);
      if (!shape) {
        console.error('Shape not found');
        return false;
      }

      // Check if already locked by someone else
      const existingLock = locks[id];
      if (existingLock && existingLock.lockedBy !== currentUser.uid) {
        console.warn('Shape is locked by another user');
        return false;
      }

      // Start editing (lock + copy to RTDB)
      const success = await realtimeShapes.startEditingShape(id, currentUser.uid, {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      });

      if (success) {
        setSelectedId(id);
      }

      return success;
    } catch (error) {
      console.error('Error starting shape edit:', error);
      return false;
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
        
        // Send final update to RTDB FIRST (forceUpdate=true bypasses throttle)
        // This ensures other users see the final position immediately
        await realtimeShapes.updateEditingShape(id, stateToCommit, true);
        
        // Commit to Firestore (persistent storage) - run in parallel
        const firestorePromise = shapeService.updateShape(id, {
          x: stateToCommit.x,
          y: stateToCommit.y,
          width: stateToCommit.width,
          height: stateToCommit.height,
        });
        
        // Wait longer to ensure RTDB update is visible to other users
        // AND give Firestore time to propagate before clearing RTDB
        // This prevents the "gap" where other users see neither RTDB nor Firestore data
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Wait for Firestore to complete
        await firestorePromise;
        
        // Additional small delay to ensure Firestore propagates to other clients
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.warn('Skipping Firestore commit - invalid or incomplete shape data', { id, stateToCommit });
      }

      // Clear from RTDB and release lock (only after Firestore has propagated)
      await realtimeShapes.finishEditingShape(id, currentUser.uid);
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
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (error) {
      console.error('Error deleting shape:', error);
    }
  };

  // Simple select (without locking - locking now happens on drag/transform start)
  const selectShape = (id) => {
    setSelectedId(id);
  };

  // Deselect shape
  const deselectShape = () => {
    // Just deselect - don't finish editing
    // Editing is finished in onDragEnd/onTransformEnd handlers
    setSelectedId(null);
  };

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
    selectedId,
    setSelectedId: selectShape,
    deselectShape,
    scale,
    setScale: handleZoom,
    position,
    setPosition,
    stageRef,
    addShape,
    updateShape,
    updateShapeTemporary,
    startEditingShape,
    finishEditingShape,
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

