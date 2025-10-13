import { createContext, useState, useRef, useEffect, useContext } from 'react';
import { MIN_ZOOM, MAX_ZOOM, INITIAL_CANVAS_X, INITIAL_CANVAS_Y } from '../utils/constants';
import { AuthContext } from './AuthContext';
import * as shapeService from '../services/shapes';

export const CanvasContext = createContext();

export const CanvasProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const [shapes, setShapes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ 
    x: window.innerWidth / 2 - INITIAL_CANVAS_X, 
    y: window.innerHeight / 2 - INITIAL_CANVAS_Y 
  });
  const [loading, setLoading] = useState(true);
  const stageRef = useRef(null);

  // Load shapes from Firestore and subscribe to updates
  useEffect(() => {
    if (!currentUser) {
      setShapes([]);
      setLoading(false);
      return;
    }

    let unsubscribe;

    const initializeCanvas = async () => {
      try {
        // Load initial shapes
        const initialShapes = await shapeService.loadShapes();
        setShapes(initialShapes);

        // Subscribe to real-time updates
        unsubscribe = shapeService.subscribeToShapes((updatedShapes) => {
          setShapes(updatedShapes);
        });

        setLoading(false);
      } catch (error) {
        console.error('Error initializing canvas:', error);
        setLoading(false);
      }
    };

    initializeCanvas();

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Set up disconnect handler to unlock shapes when user leaves
  useEffect(() => {
    if (!currentUser) return;

    const cleanup = shapeService.setupDisconnectHandler(currentUser.uid);

    return () => {
      cleanup();
    };
  }, [currentUser]);

  // Auto-unlock when selection changes
  useEffect(() => {
    if (!currentUser) return;

    // When deselecting, unlock the previously selected shape
    return () => {
      if (selectedId) {
        shapeService.unlockShape(selectedId, currentUser.uid).catch((error) => {
          console.error('Error unlocking shape on deselect:', error);
        });
      }
    };
  }, [selectedId, currentUser]);

  // Add a new shape
  const addShape = async (shapeData) => {
    if (!currentUser) {
      console.error('Must be logged in to add shapes');
      return null;
    }

    try {
      const newShapeId = await shapeService.createShape(shapeData);
      return newShapeId;
    } catch (error) {
      console.error('Error adding shape:', error);
      return null;
    }
  };

  // Update an existing shape
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

  // Delete a shape
  const deleteShape = async (id) => {
    if (!currentUser) {
      console.error('Must be logged in to delete shapes');
      return;
    }

    try {
      // Check if the shape is locked by this user or unlocked
      const shape = shapes.find((s) => s.id === id);
      if (shape && shapeService.isShapeLockedByOther(shape, currentUser.uid)) {
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

  // Lock a shape when selecting it
  const selectShape = async (id) => {
    if (!currentUser || !id) {
      setSelectedId(null);
      return;
    }

    try {
      // Unlock previously selected shape
      if (selectedId && selectedId !== id) {
        await shapeService.unlockShape(selectedId, currentUser.uid);
      }

      // Try to lock the new shape
      const locked = await shapeService.lockShape(id, currentUser.uid);
      
      if (locked) {
        setSelectedId(id);
      } else {
        console.warn('Shape is locked by another user');
        setSelectedId(null);
      }
    } catch (error) {
      console.error('Error selecting shape:', error);
      setSelectedId(null);
    }
  };

  // Deselect and unlock
  const deselectShape = async () => {
    if (!currentUser || !selectedId) {
      setSelectedId(null);
      return;
    }

    try {
      await shapeService.unlockShape(selectedId, currentUser.uid);
      setSelectedId(null);
    } catch (error) {
      console.error('Error deselecting shape:', error);
      setSelectedId(null);
    }
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
    deleteShape,
    resetView,
    loading,
    currentUser,
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
};

