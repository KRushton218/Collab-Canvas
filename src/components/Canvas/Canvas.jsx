import { useContext, useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Transformer, Group, Path, Line, Circle, Text as KonvaText } from 'react-konva';
import { CanvasContext } from '../../contexts/CanvasContext';
import { isShapeLockedByOther } from '../../services/shapes';
import { useCursors } from '../../hooks/useCursors';
import { Cursor } from '../Collaboration/Cursor';
import ShapeNode from './ShapeNode';
import SelectionGroupNode from './SelectionGroupNode';
import { RectangleObject, CircleObject, LineObject, TextObject } from '../../models/CanvasObject';
import { 
  MIN_ZOOM,
  MAX_ZOOM,
  MIN_SHAPE_SIZE,
  MAX_SHAPE_SIZE,
} from '../../utils/constants';
import CanvasControls from './CanvasControls';
import LeftPanel from './LeftPanel';
import CanvasHelpOverlay from './CanvasHelpOverlay';
import StylePanel from './StylePanel';
import InfiniteGrid from './InfiniteGrid';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { logLockedShapeClick } from '../../utils/lockClickLogger';

const Canvas = ({ currentUserColor = '#000000' }) => {
  const {
    shapes,
    selectedIds,
    selectedId, // Backward compatibility (first selected if only one)
    selectShape,
    toggleSelection,
    selectMultiple,
    toggleMultiple,
    deselectAll,
    deselectShape,
    scale,
    setScale,
    position,
    setPosition,
    stageRef,
    addShape,
    updateShape,
    updateShapeTemporary,
    updateShapesTemporaryBatch,
    startEditingShape,
    startEditingMultipleShapes,
    finishEditingShape,
    finishEditingMultipleShapes,
    deleteShape,
    currentUser,
    loading,
    locks,
    activeTool,
    setActiveTool,
    currentFill,
    // New features
    undo,
    redo,
    canUndo,
    canRedo,
    copySelected,
    pasteFromClipboard,
    hasClipboard,
    duplicateSelected,
    bringToFront,
    sendToBack,
    moveSelectedShapes,
    selectAll,
  } = useContext(CanvasContext);
  const transformerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStart, setCreationStart] = useState(null); // {x,y}
  const [creationDraft, setCreationDraft] = useState(null); // { type, x,y,width,height,points, fill }
  
  // Selection box state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null); // {x, y}
  const [selectionBox, setSelectionBox] = useState(null); // {x, y, width, height}
  const [selectionModifier, setSelectionModifier] = useState(null); // 'toggle' or null
  
  // Track which shapes are being actively edited by this user
  // This ensures the lock border persists throughout the drag/transform
  const [editingShapes, setEditingShapes] = useState(new Set());
  const editingShapesRef = useRef(new Set());
  
  // Batching mechanism for multi-drag RTDB updates
  const pendingBatchUpdatesRef = useRef({});
  const batchUpdateTimeoutRef = useRef(null);
  
  // Toast notification state
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  
  // Text editing state
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const textInputRef = useRef(null);
  
  // Line endpoint editing state
  const [draggingEndpoint, setDraggingEndpoint] = useState(null); // { shapeId, endpoint: 'start'|'end' }
  
  // Keep ref in sync with state
  useEffect(() => {
    editingShapesRef.current = editingShapes;
  }, [editingShapes]);
  
  // Throttled batch update sender (called when multi-dragging)
  const sendBatchUpdates = () => {
    if (Object.keys(pendingBatchUpdatesRef.current).length > 0) {
      updateShapesTemporaryBatch(pendingBatchUpdatesRef.current);
      pendingBatchUpdatesRef.current = {};
    }
  };
  
  // Queue a shape update for batching (used during multi-drag)
  const queueBatchUpdate = (shapeId, updates) => {
    pendingBatchUpdatesRef.current[shapeId] = updates;
    
    // Clear existing timeout
    if (batchUpdateTimeoutRef.current) {
      clearTimeout(batchUpdateTimeoutRef.current);
    }
    
    // Send batched updates after a short delay (allows multiple shapes to queue)
    batchUpdateTimeoutRef.current = setTimeout(sendBatchUpdates, 10);
  };
  
  // Show toast notification
  const showToast = (message, duration = 2000) => {
    // Clear existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    setToast(message);
    
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  };
  
  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);
  
  // ========== SELECTION GROUP HANDLERS (for multi-selection as single entity) ==========
  const handleGroupDragStart = async (groupData) => {
    if (isPanning) return;
    
    // Start editing all shapes in the group
    const selectedShapeIds = Array.from(selectedIds);
    const initialStates = {};
    for (const id of selectedShapeIds) {
      const shape = shapes.find(s => s.id === id);
      if (shape) {
        initialStates[id] = {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        };
      }
    }
    
    const result = await startEditingMultipleShapes(selectedShapeIds);
    if (result.success) {
      setEditingShapes(new Set(selectedShapeIds));
    } else {
      showToast(`🔒 ${result.failedShapes.length} shapes are locked by another user`);
    }
  };
  
  const handleGroupDragMove = (finalStates) => {
    if (isPanning) return;
    
    // Update RTDB with batched updates (throttled)
    updateShapesTemporaryBatch(finalStates);
    
    // Update cursor position
    updateMyCursor(Object.values(finalStates)[0]?.x || 0, Object.values(finalStates)[0]?.y || 0);
  };
  
  const handleGroupDragEnd = async (finalStates) => {
    if (isPanning) return;
    
    // Commit all shapes to Firestore
    const idsArray = Object.keys(finalStates);
    await finishEditingMultipleShapes(idsArray, finalStates);
    
    // Clear editing state
    setEditingShapes(new Set());
  };
  
  const handleGroupTransformEnd = async (finalStates) => {
    if (isPanning) return;
    
    // Commit all shapes to Firestore
    const idsArray = Object.keys(finalStates);
    await finishEditingMultipleShapes(idsArray, finalStates);
    
    // Clear editing state
    setEditingShapes(new Set());
  };
  
  // Focus text input when editing starts
  useEffect(() => {
    if (editingTextId && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [editingTextId]);
  
  // Handle text edit completion
  const finishTextEdit = async () => {
    if (editingTextId) {
      const trimmedText = (editingTextValue || '').trim();
      if (trimmedText) {
        // Save the text if it's not empty
        await updateShape(editingTextId, { text: editingTextValue });
      } else {
        // Delete the shape if text is empty (user didn't enter anything)
        await deleteShape(editingTextId);
      }
      setEditingTextId(null);
      setEditingTextValue('');
      // Switch back to select tool after creating text
      if (activeTool === 'text') {
        setActiveTool('select');
      }
    }
  };
  
  // Handle text edit cancel
  const cancelTextEdit = async () => {
    if (editingTextId) {
      // Check if the shape has existing text or was just created
      const shape = shapes.find(s => s.id === editingTextId);
      if (shape && !shape.text) {
        // If no text exists, delete the shape (was a new creation that was cancelled)
        await deleteShape(editingTextId);
      }
    }
    setEditingTextId(null);
    setEditingTextValue('');
  };
  
  // Cursor tracking and online users for lock colors
  const { cursors, updateMyCursor } = useCursors(currentUser?.uid, stageRef);
  
  // Viewport culling - only render shapes visible in current viewport
  // CRITICAL: Always render ALL selected shapes (even off-screen) for proper visual feedback
  const visibleShapes = useMemo(() => {
    if (!stageRef.current || shapes.length === 0) return shapes;
    
    // If small number of shapes, render all (no benefit to culling)
    if (shapes.length < 100) return shapes;
    
    const stage = stageRef.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get canvas coordinates for viewport bounds
    const transform = stage.getAbsoluteTransform().copy().invert();
    const topLeft = transform.point({ x: 0, y: 0 });
    const bottomRight = transform.point({ x: viewportWidth, y: viewportHeight });
    
    // Add margin for shapes partially visible
    const margin = 200;
    const viewportBounds = {
      left: topLeft.x - margin,
      top: topLeft.y - margin,
      right: bottomRight.x + margin,
      bottom: bottomRight.y + margin,
    };
    
    // Filter shapes that intersect with viewport
    return shapes.filter(shape => {
      const shapeRight = shape.x + (shape.width || 0);
      const shapeBottom = shape.y + (shape.height || 0);
      
      // CRITICAL: Always render selected shapes (even if off-screen) 
      // This ensures selection borders, lock borders, and transformer handles all work
      if (selectedIds.has(shape.id)) return true;
      
      // Check if shape intersects viewport
      return !(shapeRight < viewportBounds.left ||
               shape.x > viewportBounds.right ||
               shapeBottom < viewportBounds.top ||
               shape.y > viewportBounds.bottom);
    });
  }, [shapes, position, scale, selectedIds]);
  
  // Memoize selected shapes - only recalculate when selection actually changes
  const selectedShapes = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return shapes.filter(s => selectedIds.has(s.id));
  }, [selectedIds.size, shapes.length]); // Shallow deps to avoid expensive checks
  
  // Centralized keyboard shortcuts
  useKeyboardShortcuts({
    selectedIds,
    deselectAll,
    selectAll,
    setActiveTool,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelected,
    pasteFromClipboard,
    duplicateSelected,
    deleteShape,
    bringToFront,
    sendToBack,
    moveSelectedShapes,
    isEditingText: !!editingTextId,
  });
  
  // Get lock owner's color helper
  const getLockOwnerColor = (shape) => {
    if (!shape.lockedBy) return null;
    
    // Find the user in cursors (which includes all online users)
    const lockOwner = Object.entries(cursors).find(([userId]) => userId === shape.lockedBy);
    
    // Return their color, or current user's color if they locked it
    if (shape.lockedBy === currentUser?.uid) {
      return currentUserColor;
    }
    
    return lockOwner ? lockOwner[1].color : '#ff6b6b'; // Fallback to red
  };
  
  // Get lock owner's display name
  const getLockOwnerName = (shape) => {
    if (!shape.lockedBy) return null;
    
    // Don't show name if current user is the lock owner
    if (shape.lockedBy === currentUser?.uid) return null;
    
    // Find the user in cursors (which includes all online users)
    const lockOwner = Object.entries(cursors).find(([userId]) => userId === shape.lockedBy);
    
    if (lockOwner) {
      return lockOwner[1].displayName || 'Another user';
    }
    
    return 'Another user';
  };

  const isEditableElement = (element) => {
    if (!element) return false;
    const tagName = element.tagName?.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      element.isContentEditable
    );
  };

  // Handle wheel zoom
  const handleWheel = (e) => {
    e.evt.preventDefault();
    
    // Gate zoom to ctrl/meta + scroll
    const isZoomGesture = e.evt.ctrlKey || e.evt.metaKey;
    if (!isZoomGesture) return;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    // Calculate new scale
    const scaleBy = 1.05;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    // Clamp scale between min and max
    const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    
    setScale(clampedScale);

    // Zoom to cursor position
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setPosition(newPos);
  };

  // Handle stage click to deselect
  const handleStageClick = (e) => {
    if (isPanning) {
      return;
    }
    // If in draw mode, clicking stage should not deselect or create here (handled in mousedown/up)
    if (activeTool && activeTool !== 'select') {
      return;
    }
    // Deselect if clicking on stage background
    if (e.target === e.target.getStage()) {
      deselectShape();
    }
  };

  // Keyboard delete now handled by useKeyboardShortcuts hook

  // Cleanup: finish any active editing sessions on unmount
  useEffect(() => {
    return () => {
      // Finish editing all shapes we have open
      // Use the ref to get the current state at cleanup time
      const shapesToFinish = Array.from(editingShapesRef.current);
      shapesToFinish.forEach((shapeId) => {
        // Get the shape's current position from the canvas
        const stage = stageRef.current;
        if (stage) {
          const node = stage.findOne(`#${shapeId}`);
          if (node) {
            finishEditingShape(shapeId, {
              x: node.x(),
              y: node.y(),
              width: node.width(),
              height: node.height()
            }).catch((error) => {
              console.error('Error finishing shape edit on unmount:', error);
            });
          } else {
            // Node not found, just cleanup RTDB without Firestore commit
            finishEditingShape(shapeId).catch((error) => {
              console.error('Error finishing shape edit on unmount:', error);
            });
          }
        }
      });
    };
  }, []); // Empty deps - cleanup function uses refs

  // Handle drag end for stage panning
  const handleDragEnd = (e) => {
    const target = e.target;
    if (target !== stageRef.current) {
      return;
    }

    setPosition({
      x: target.x(),
      y: target.y(),
    });

    const stage = stageRef.current;
    if (stage) {
      stage.container().style.cursor = isPanning ? 'grab' : 'default';
    }
  };

  // Sync transformer with selected nodes
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) {
      return;
    }

    if (selectedIds.size > 0) {
      // Find all selected nodes, but EXCLUDE lines (they use custom endpoint handles)
      const selectedNodes = Array.from(selectedIds)
        .map(id => {
          const node = stage.findOne(`#${id}`);
          if (!node) return null;
          // Get shape data to check type
          const shape = shapes.find(s => s.id === id);
          // Exclude lines from transformer (they have custom endpoint editing)
          if (shape && shape.type === 'line') return null;
          return node;
        })
        .filter(node => node != null); // Filter out both null AND undefined
      
      if (selectedNodes.length > 0) {
        transformer.nodes(selectedNodes);
        transformer.getLayer()?.batchDraw();
      } else {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      // When deselecting, ensure any local editing borders are cleared
      setEditingShapes(new Set());
    }
  }, [selectedIds, shapes, stageRef]);

  // Handle spacebar pan mode (Space key separate from other shortcuts)
  useEffect(() => {
    const isEditableElement = (el) => {
      return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !isEditableElement(e.target)) {
        e.preventDefault();
        setIsPanning(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update cursor based on pan state
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const container = stage.container();
    // Show hand cursor when holding Space (pan mode)
    if (isPanning) {
      container.style.cursor = 'grab';
    } else {
      // Reset to default when not panning
      container.style.cursor = '';
    }

    return () => {
      container.style.cursor = '';
    };
  }, [isPanning, stageRef]);

  const handleDragStart = () => {
    if (isPanning) {
      const stage = stageRef.current;
      if (stage) {
        stage.container().style.cursor = 'grabbing';
      }
    }
  };

  // Check if shape is locked by another user
  const isLockedByOther = (shape) => {
    return currentUser && isShapeLockedByOther(locks, shape.id, currentUser.uid);
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff'
      }}>
        <div>Loading canvas...</div>
      </div>
    );
  }

  // Handle mouse move for cursor tracking
  const handleMouseMove = (e) => {
    if (!stageRef.current) return;
    
    const stage = stageRef.current;
    const pointerPosition = stage.getPointerPosition();
    
    if (pointerPosition) {
      // Convert screen coordinates to canvas coordinates
      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const canvasPos = transform.point(pointerPosition);
      
      // Update live creation draft while dragging
      if (isCreating && creationStart && activeTool && activeTool !== 'select') {
        const startX = creationStart.x;
        const startY = creationStart.y;
        const currentX = canvasPos.x;
        const currentY = canvasPos.y;

        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        if (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'text') {
          setCreationDraft({ type: activeTool, x, y, width, height, fill: currentFill });
        } else if (activeTool === 'line') {
          setCreationDraft({ type: activeTool, points: [startX, startY, currentX, currentY], stroke: currentUserColor, strokeWidth: 2 });
        }
      }
      
      // Update selection box while dragging
      if (isSelecting && selectionStart) {
        const startX = selectionStart.x;
        const startY = selectionStart.y;
        const currentX = canvasPos.x;
        const currentY = canvasPos.y;

        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        setSelectionBox({ x, y, width, height });
      }

      // Update cursor position in Firebase
      updateMyCursor(canvasPos.x, canvasPos.y);
    }
  };

  // Begin creation on mouse down when in tool mode
  const handleMouseDown = (e) => {
    if (!stageRef.current) return;
    if (isPanning) return;
    
    // More relaxed click detection - allow clicks on Stage or background Layer
    // This ensures selection box works even in dense canvases
    const targetName = e.target.constructor.name;
    const isBackground = e.target === e.target.getStage() || 
                         targetName === 'Stage' || 
                         targetName === 'Layer' ||
                         e.target.attrs?.id === 'background-layer';
    
    if (!isBackground) return; // Clicked on a shape or other element

    const stage = stageRef.current;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const canvasPos = transform.point(pointerPosition);

    // Check if we're in a drawing tool mode
    if (activeTool && activeTool !== 'select') {
      // Drawing mode
      setIsCreating(true);
      setCreationStart({ x: canvasPos.x, y: canvasPos.y });
      setCreationDraft(null);
    } else {
      // Select mode: start drag selection
      const isModifierPressed = e.evt?.shiftKey || e.evt?.ctrlKey || e.evt?.metaKey;
      setIsSelecting(true);
      setSelectionStart({ x: canvasPos.x, y: canvasPos.y });
      setSelectionBox(null);
      setSelectionModifier(isModifierPressed ? 'toggle' : null);
    }
  };

  // Commit creation or selection on mouse up
  const handleMouseUp = async (e) => {
    // Handle selection box
    if (isSelecting) {
      setIsSelecting(false);
      
      if (selectionBox && selectionBox.width > 5 && selectionBox.height > 5) {
        // OPTIMIZATION: Only check shapes in the selection box area (not all 641!)
        // This dramatically improves performance with large canvases
        const boxLeft = selectionBox.x;
        const boxTop = selectionBox.y;
        const boxRight = selectionBox.x + selectionBox.width;
        const boxBottom = selectionBox.y + selectionBox.height;
        
        // Filter to shapes that could possibly intersect
        const candidateShapes = shapes.filter(shape => {
          const shapeRight = shape.x + (shape.width || 0);
          const shapeBottom = shape.y + (shape.height || 0);
          
          // Quick bounds check - if shape is nowhere near selection box, skip
          return !(shapeRight < boxLeft || 
                   shape.x > boxRight || 
                   shapeBottom < boxTop || 
                   shape.y > boxBottom);
        });
        
        // Now check locks only for candidate shapes (much smaller set)
        const selectedShapeIds = candidateShapes.filter(shape => {
          // NEVER select shapes locked by other users
          const isLockedByOther = currentUser && isShapeLockedByOther(locks, shape.id, currentUser.uid);
          return !isLockedByOther;
        }).map(shape => shape.id);
        
        // Log any locked shapes that were excluded from selection
        const lockedShapesInBox = candidateShapes.filter(shape => {
          return currentUser && isShapeLockedByOther(locks, shape.id, currentUser.uid);
        });
        
        if (lockedShapesInBox.length > 0) {
          lockedShapesInBox.forEach(shape => {
            const lockOwnerInfo = {
              displayName: getLockOwnerName(shape) || 'Unknown User',
              color: getLockOwnerColor(shape),
              uid: shape.lockedBy,
            };
            
            logLockedShapeClick({
              shape,
              locks,
              lockOwnerInfo,
              eventType: 'rectangular_selection_attempted',
            });
          });
        }
        
        if (selectionModifier === 'toggle') {
          // Toggle selection
          toggleMultiple(selectedShapeIds);
        } else {
          // Replace selection
          selectMultiple(selectedShapeIds);
        }
      }
      
      setSelectionStart(null);
      setSelectionBox(null);
      setSelectionModifier(null);
      return;
    }
    
    // Handle shape creation
    if (!isCreating) return;
    setIsCreating(false);

    const stage = stageRef.current;
    if (!stage) return;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const canvasPos = transform.point(pointerPosition);

    const start = creationStart;
    setCreationStart(null);

    const dx = Math.abs(canvasPos.x - start.x);
    const dy = Math.abs(canvasPos.y - start.y);
    const dragged = dx > 2 || dy > 2; // small threshold

    try {
      if (!dragged) {
        // Click: default size
        const size = 100;
        const x = start.x - size / 2;
        const y = start.y - size / 2;

        if (activeTool === 'rectangle') {
          const obj = new RectangleObject({ x, y, width: size, height: size, fill: currentFill });
          await addShape(obj.toRecord());
        } else if (activeTool === 'circle') {
          const obj = new CircleObject({ x, y, width: size, height: size, fill: currentFill });
          await addShape(obj.toRecord());
        } else if (activeTool === 'line') {
          const obj = new LineObject({ points: [start.x, start.y, start.x + size, start.y + size] });
          await addShape(obj.toRecord());
        } else if (activeTool === 'text') {
          // Position text so click point is at the center (more intuitive UX)
          const textWidth = 160;
          const textHeight = 40;
          const obj = new TextObject({ 
            x: x - textWidth / 2, 
            y: y - textHeight / 2, 
            width: textWidth, 
            height: textHeight, 
            fill: '#111827', 
            text: '' 
          });
          const newShapeId = await addShape(obj.toRecord());
          if (newShapeId) {
            console.log('[Text] Created new text shape', { id: newShapeId, x: x - textWidth / 2, y: y - textHeight / 2, width: textWidth, height: textHeight });
          }
          // Immediately open text editor for the new shape
          if (newShapeId) {
            // Wait a brief moment for the shape to be added to state
            setTimeout(() => {
              setEditingTextId(newShapeId);
              setEditingTextValue('');
            }, 50);
          }
        }
      } else {
        // Drag: use draft
        if (!creationDraft) return;
        if (creationDraft.type === 'rectangle') {
          const { x, y, width, height, fill } = creationDraft;
          const obj = new RectangleObject({ x, y, width, height, fill });
          await addShape(obj.toRecord());
        } else if (creationDraft.type === 'circle') {
          const { x, y, width, height, fill } = creationDraft;
          const obj = new CircleObject({ x, y, width, height, fill });
          await addShape(obj.toRecord());
        } else if (creationDraft.type === 'line') {
          const { points, stroke, strokeWidth } = creationDraft;
          const obj = new LineObject({ points, stroke, strokeWidth });
          await addShape(obj.toRecord());
        } else if (creationDraft.type === 'text') {
          const { x, y, width, height } = creationDraft;
          const obj = new TextObject({ x, y, width, height, fill: '#111827', text: '' });
          const newShapeId = await addShape(obj.toRecord());
          if (newShapeId) {
            console.log('[Text] Created new text shape (drag)', { id: newShapeId, x, y, width, height });
          }
          // Immediately open text editor for the new shape
          if (newShapeId) {
            // Wait a brief moment for the shape to be added to state
            setTimeout(() => {
              setEditingTextId(newShapeId);
              setEditingTextValue('');
            }, 50);
          }
        }
      }
    } finally {
      setCreationDraft(null);
      // Stay in current tool mode to allow multiple placements if desired
    }
  };

  // Custom cursor SVG with user's color outline
  const customCursorSVG = `data:image/svg+xml;base64,${btoa(`
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 1 1 L 1 15 L 5 11 L 8 17 L 10 16 L 7 10 L 12 10 Z" 
            fill="black" stroke="${currentUserColor}" stroke-width="2"/>
    </svg>
  `)}`;

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* Custom cursor style with outline for current user */}
      <style>{`
        canvas {
          cursor: ${isPanning ? 'grab' : `url('${customCursorSVG}') 1 1, auto`} !important;
        }
      `}</style>
      
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        draggable={isPanning}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Infinite grid background */}
        <InfiniteGrid
          stageWidth={window.innerWidth}
          stageHeight={window.innerHeight}
          stageX={position.x}
          stageY={position.y}
          scale={scale}
        />
        
        <Layer>
          {/* Selection box preview */}
          {selectionBox && (
            <Rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill="rgba(99, 102, 241, 0.1)"
              stroke="#6366f1"
              strokeWidth={2 / scale}
              dash={[10 / scale, 5 / scale]}
              listening={false}
            />
          )}
          
          {/* Live creation preview */}
          {creationDraft && (
            <Group listening={false}>
              {creationDraft.type === 'rectangle' && (
                <Rect x={creationDraft.x} y={creationDraft.y} width={creationDraft.width} height={creationDraft.height} fill={creationDraft.fill} opacity={0.4} />
              )}
              {creationDraft.type === 'circle' && (
                <Circle
                  x={creationDraft.x + Math.min(creationDraft.width, creationDraft.height) / 2}
                  y={creationDraft.y + Math.min(creationDraft.width, creationDraft.height) / 2}
                  radius={Math.min(creationDraft.width, creationDraft.height) / 2}
                  fill={creationDraft.fill}
                  opacity={0.4}
                />
              )}
              {creationDraft.type === 'line' && (
                <Line points={creationDraft.points} stroke={creationDraft.stroke || '#374151'} strokeWidth={creationDraft.strokeWidth || 2} opacity={0.6} lineCap="round" lineJoin="round" />
              )}
              {creationDraft.type === 'text' && (
                <KonvaText x={creationDraft.x} y={creationDraft.y} width={creationDraft.width} height={creationDraft.height} text={'Text'} fontSize={18} fill={'#111827'} opacity={0.6} />
              )}
            </Group>
          )}
          
          {/* Shapes will be rendered here - VIEWPORT CULLING: only render visible shapes */}
          {visibleShapes.map((shape) => {
            // Check if this shape is being actively edited by current user
            const isBeingEditedByMe = editingShapesRef.current.has(shape.id);
            
            // Determine lock state - either from RTDB or local editing state
            const lockedByOther = isLockedByOther(shape);
            const isSelected = selectedIds.has(shape.id);
            
            // If we're editing it locally, show our color border
            // Otherwise show the lock owner's color
            const isLocked = isBeingEditedByMe || !!shape.lockedBy;
            const lockOwnerColor = isBeingEditedByMe 
              ? currentUserColor 
              : getLockOwnerColor(shape);
            const lockOwnerName = getLockOwnerName(shape);
            
            // Calculate stroke width that scales inversely with zoom
            // Base width of 6px (scaled to maintain visibility when zoomed out)
            const baseStrokeWidth = 6;
            const scaledStrokeWidth = baseStrokeWidth / scale;
            
            // Lock visual indicator removed - functionality remains
            
            const onSelect = (e) => {
              if (isPanning) return;
              
              // NEVER allow selecting locked shapes
              if (lockedByOther) {
                const ownerName = getLockOwnerName(shape);
                
                // Log the locked shape click with all lock details
                const lockOwnerInfo = {
                  displayName: ownerName || 'Unknown User',
                  color: getLockOwnerColor(shape),
                  uid: shape.lockedBy,
                };
                
                logLockedShapeClick({
                  shape,
                  locks,
                  lockOwnerInfo,
                  eventType: 'click',
                });
                
                showToast(`🔒 This shape is being edited by ${ownerName}`);
                return; // Don't select
              }
              
              // Check for modifier keys (Shift or Ctrl/Cmd)
              const isModifierPressed = e?.evt?.shiftKey || e?.evt?.ctrlKey || e?.evt?.metaKey;
              
              if (isModifierPressed) {
                // Toggle selection
                toggleSelection(shape.id);
              } else {
                // Normal click - select only this shape
                selectShape(shape.id);
              }
            };
            
            const onDoubleClick = () => {
              if (shape.type === 'text' && !lockedByOther && !isPanning) {
                setEditingTextId(shape.id);
                setEditingTextValue(shape.text || 'Text');
                console.log('[Text] Begin inline edit', { id: shape.id, box: { x: shape.x, y: shape.y, w: shape.width, h: shape.height }, fontSize: shape.fontSize, rotation: shape.rotation });
                // Focus will happen in useEffect
              }
            };

            const onStartEdit = async (e) => {
              // Don't handle individual drags when part of multi-selection group
              // SelectionGroupNode handles the entire group as one entity
              const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
              if (isPartOfGroup) return;
              
              if (lockedByOther || isPanning) return;
              // Require selection before editing/dragging
              if (!isSelected) {
                // Attempt to select (which will acquire lock) and then allow drag on subsequent interaction
                await selectShape(shape.id);
                e?.target?.stopDrag?.();
                return;
              }
              
              // Check if this is part of a multi-selection
              const isMultiSelect = selectedIds.size > 1 && selectedIds.has(shape.id);
              
              if (isMultiSelect) {
                // Multi-selection: acquire locks on ALL selected shapes
                const selectedShapeIds = Array.from(selectedIds);
                const result = await startEditingMultipleShapes(selectedShapeIds);
                
                if (result.success) {
                  // Mark all selected shapes as being edited
                  setEditingShapes(new Set(selectedShapeIds));
                } else {
                  // Some shapes couldn't be locked
                  e?.target?.stopDrag?.();
                  const failedCount = result.failedShapes.length;
                  showToast(`🔒 ${failedCount} shape${failedCount > 1 ? 's are' : ' is'} locked by another user`);
                }
              } else {
                // Single shape: prepare RTDB active edit (lock already held by selection)
                const success = await startEditingShape(shape.id);
                if (success) {
                  // Ensure only the currently edited shape remains marked as editing
                  setEditingShapes(new Set([shape.id]));
                } else {
                  e?.target?.stopDrag?.();
                }
              }
            };

            const onDragMove = (e) => {
              // Don't handle individual drags when part of multi-selection group
              const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
              if (isPartOfGroup) return;
              
              if (lockedByOther || isPanning || !editingShapesRef.current.has(shape.id)) return;
              const node = e.target;
              // Update cursor to actual pointer position in canvas coordinates
              const stage = stageRef.current;
              if (stage) {
                const pointer = stage.getPointerPosition();
                if (pointer) {
                  const transform = stage.getAbsoluteTransform().copy();
                  transform.invert();
                  const canvasPos = transform.point(pointer);
                  updateMyCursor(canvasPos.x, canvasPos.y);
                }
              }
              const isMultiSelect = editingShapesRef.current.size > 1;
              
              let updates = null;
              
              if (shape.type === 'circle') {
                const radius = node.radius?.() ?? Math.min(shape.width, shape.height) / 2;
                const diameter = radius * 2;
                const topLeftX = node.x() - radius;
                const topLeftY = node.y() - radius;
                updates = { x: topLeftX, y: topLeftY, width: diameter, height: diameter };
              } else if (shape.type === 'rectangle' || shape.type === 'text') {
                // For rectangles and text with offset, node.x() and node.y() are center positions
                const width = node.width?.() ?? shape.width;
                const height = node.height?.() ?? shape.height;
                const centerX = node.x();
                const centerY = node.y();
                // Convert center to top-left for storage
                const topLeftX = centerX - width / 2;
                const topLeftY = centerY - height / 2;
                updates = { x: topLeftX, y: topLeftY };
              } else {
                // Line - no offset
                updates = { x: node.x(), y: node.y() };
              }
              
              // Use batching for multi-select (1 RTDB write for N shapes)
              // Use individual updates for single shapes (backward compatible)
              if (isMultiSelect) {
                queueBatchUpdate(shape.id, updates);
              } else {
                updateShapeTemporary(shape.id, updates);
              }
            };

            const onDragEnd = async (e) => {
              // Don't handle individual drags when part of multi-selection group
              const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
              if (isPartOfGroup) return;
              
              if (lockedByOther || isPanning || !editingShapes.has(shape.id)) return;
              
              // Check if this is part of a multi-selection
              const isMultiSelect = editingShapes.size > 1;
              
              if (isMultiSelect) {
                // Multi-selection: collect final states for all shapes
                const stage = stageRef.current;
                if (!stage) return;
                
                // Send any pending batch updates immediately
                if (batchUpdateTimeoutRef.current) {
                  clearTimeout(batchUpdateTimeoutRef.current);
                  sendBatchUpdates();
                }
                
                const finalStates = {};
                editingShapes.forEach(shapeId => {
                  const node = stage.findOne(`#${shapeId}`);
                  const shapeData = shapes.find(s => s.id === shapeId);
                  if (node && shapeData) {
                    if (shapeData.type === 'circle') {
                      const radius = node.radius?.() ?? Math.min(shapeData.width, shapeData.height) / 2;
                      const diameter = radius * 2;
                      const topLeftX = node.x() - radius;
                      const topLeftY = node.y() - radius;
                      finalStates[shapeId] = { x: topLeftX, y: topLeftY, width: diameter, height: diameter };
                    } else if (shapeData.type === 'rectangle' || shapeData.type === 'text') {
                      const width = node.width?.() ?? shapeData.width;
                      const height = node.height?.() ?? shapeData.height;
                      const topLeftX = node.x() - width / 2;
                      const topLeftY = node.y() - height / 2;
                      finalStates[shapeId] = { x: topLeftX, y: topLeftY, width, height };
                    } else {
                      const width = node.width?.() ?? shapeData.width;
                      const height = node.height?.() ?? shapeData.height;
                      finalStates[shapeId] = { x: node.x(), y: node.y(), width, height };
                    }
                  }
                });
                
                await finishEditingMultipleShapes(Array.from(editingShapes), finalStates);
                // Clear editing markers AFTER locks are released
                setEditingShapes(new Set());
              } else {
                // Single shape: use existing logic
                const node = e.target;
                if (shape.type === 'circle') {
                  const radius = node.radius?.() ?? Math.min(shape.width, shape.height) / 2;
                  const diameter = radius * 2;
                  const topLeftX = node.x() - radius;
                  const topLeftY = node.y() - radius;
                  await finishEditingShape(shape.id, { x: topLeftX, y: topLeftY, width: diameter, height: diameter });
                } else if (shape.type === 'rectangle' || shape.type === 'text') {
                  const width = node.width?.() ?? shape.width;
                  const height = node.height?.() ?? shape.height;
                  const topLeftX = node.x() - width / 2;
                  const topLeftY = node.y() - height / 2;
                  await finishEditingShape(shape.id, { x: topLeftX, y: topLeftY, width, height });
                } else {
                  const width = node.width?.() ?? shape.width;
                  const height = node.height?.() ?? shape.height;
                  await finishEditingShape(shape.id, { x: node.x(), y: node.y(), width, height });
                }
                // Clear editing markers AFTER lock is released
                setEditingShapes(new Set());
              }
            };

            const onTransform = (e) => {
              // Don't handle individual transforms when part of multi-selection group
              const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
              if (isPartOfGroup) return;
              
              if (lockedByOther || isPanning || !editingShapesRef.current.has(shape.id)) return;
              const node = e.target;
              const scaleX = node.scaleX?.() ?? 1;
              const scaleY = node.scaleY?.() ?? 1;
              const rotation = node.rotation?.() ?? 0;
              // Update cursor to actual pointer position in canvas coordinates
              const stage = stageRef.current;
              if (stage) {
                const pointer = stage.getPointerPosition();
                if (pointer) {
                  const transform = stage.getAbsoluteTransform().copy();
                  transform.invert();
                  const canvasPos = transform.point(pointer);
                  updateMyCursor(canvasPos.x, canvasPos.y);
                }
              }
              
              // Detect if this is a pure rotation (no scale change)
              const isPureRotation = Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01;
              
              if (isPureRotation) {
                // Pure rotation: only send rotation, don't update x/y
                // For shapes with offset, node.x() is already center
                updateShapeTemporary(shape.id, { rotation });
              } else if (shape.type === 'circle') {
                const currDiameterX = (node.width?.() ?? Math.min(shape.width, shape.height)) * scaleX;
                const currDiameterY = (node.height?.() ?? Math.min(shape.width, shape.height)) * scaleY;
                const diameter = Math.max(MIN_SHAPE_SIZE, Math.min(Math.min(currDiameterX, currDiameterY), MAX_SHAPE_SIZE));
                const radius = diameter / 2;
                const topLeftX = node.x() - radius;
                const topLeftY = node.y() - radius;
                updateShapeTemporary(shape.id, { x: topLeftX, y: topLeftY, width: diameter, height: diameter, rotation });
              } else if (shape.type === 'text') {
                const baseWidth = node.width?.() ?? shape.width;
                const baseHeight = node.height?.() ?? shape.height;
                const width = Math.max(MIN_SHAPE_SIZE, Math.min(baseWidth * scaleX, MAX_SHAPE_SIZE));
                const height = Math.max(MIN_SHAPE_SIZE, Math.min(baseHeight * scaleY, MAX_SHAPE_SIZE));
                // Auto-fit option: derive font size to match target height (line-height aware)
                let nextFont;
                if (shape.autoFitHeight) {
                  // Keep roughly a single line’s height matching box height (minus padding)
                  const padding = shape.padding ?? 4;
                  const usableHeight = Math.max(8, height - padding * 2);
                  nextFont = Math.max(8, Math.min(512, Math.round(usableHeight / (shape.lineHeight ?? 1.2))));
                } else {
                  // Only vertical scale affects font size; width changes should not
                  const scaleFactor = scaleY;
                  const currentFont = shape.fontSize || 18;
                  nextFont = Math.max(8, Math.min(512, Math.round(currentFont * scaleFactor)));
                }
                // node.x() and node.y() are center positions (because of offset)
                const centerX = node.x();
                const centerY = node.y();
                const topLeftX = centerX - width / 2;
                const topLeftY = centerY - height / 2;
                updateShapeTemporary(shape.id, { x: topLeftX, y: topLeftY, width, height, fontSize: nextFont, rotation });
                console.log('[Text] Transform live', { id: shape.id, width, height, nextFont, rotation });
              } else if (shape.type === 'rectangle') {
                const width = Math.max(MIN_SHAPE_SIZE, Math.min((node.width?.() ?? shape.width) * scaleX, MAX_SHAPE_SIZE));
                const height = Math.max(MIN_SHAPE_SIZE, Math.min((node.height?.() ?? shape.height) * scaleY, MAX_SHAPE_SIZE));
                // node.x() and node.y() are center positions (because of offset)
                const centerX = node.x();
                const centerY = node.y();
                const topLeftX = centerX - width / 2;
                const topLeftY = centerY - height / 2;
                updateShapeTemporary(shape.id, { x: topLeftX, y: topLeftY, width, height, rotation });
              } else {
                // Line - no offset
                const width = Math.max(MIN_SHAPE_SIZE, Math.min((node.width?.() ?? shape.width) * scaleX, MAX_SHAPE_SIZE));
                const height = Math.max(MIN_SHAPE_SIZE, Math.min((node.height?.() ?? shape.height) * scaleY, MAX_SHAPE_SIZE));
                updateShapeTemporary(shape.id, { x: node.x(), y: node.y(), width, height, rotation });
              }
            };

            const onTransformEnd = async (e) => {
              // Don't handle individual transforms when part of multi-selection group
              const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
              if (isPartOfGroup) return;
              
              if (lockedByOther || isPanning || !editingShapes.has(shape.id)) return;
              
              // Check if this is part of a multi-selection
              const isMultiSelect = editingShapes.size > 1;
              
              if (isMultiSelect) {
                // Multi-selection: collect final states for all shapes
                const stage = stageRef.current;
                if (!stage) return;
                
                const finalStates = {};
                editingShapes.forEach(shapeId => {
                  const node = stage.findOne(`#${shapeId}`);
                  const shapeData = shapes.find(s => s.id === shapeId);
                  if (node && shapeData) {
                    const scaleX = node.scaleX?.() ?? 1;
                    const scaleY = node.scaleY?.() ?? 1;
                    const rotation = node.rotation?.() ?? 0;
                    
                    if (shapeData.type === 'circle') {
                      const currDiameterX = (node.width?.() ?? Math.min(shapeData.width, shapeData.height)) * scaleX;
                      const currDiameterY = (node.height?.() ?? Math.min(shapeData.width, shapeData.height)) * scaleY;
                      const diameter = Math.max(MIN_SHAPE_SIZE, Math.min(Math.min(currDiameterX, currDiameterY), MAX_SHAPE_SIZE));
                      const radius = diameter / 2;
                      node.scaleX?.(1);
                      node.scaleY?.(1);
                      node.radius?.(radius);
                      const topLeftX = node.x() - radius;
                      const topLeftY = node.y() - radius;
                      finalStates[shapeId] = { x: topLeftX, y: topLeftY, width: diameter, height: diameter, rotation };
                    } else if (shapeData.type === 'text') {
                      const baseWidth = node.width?.() ?? shapeData.width;
                      const baseHeight = node.height?.() ?? shapeData.height;
                      const width = Math.max(MIN_SHAPE_SIZE, Math.min(baseWidth * scaleX, MAX_SHAPE_SIZE));
                      const height = Math.max(MIN_SHAPE_SIZE, Math.min(baseHeight * scaleY, MAX_SHAPE_SIZE));
                      // Font size should follow vertical scale only; width changes should NOT change font size
                      const scaleFactor = scaleY;
                      const currentFont = shapeData.fontSize || 18;
                      const nextFont = Math.max(8, Math.min(512, Math.round(currentFont * scaleFactor)));
                      node.scaleX?.(1);
                      node.scaleY?.(1);
                      node.size?.({ width, height });
                      const topLeftX = node.x() - width / 2;
                      const topLeftY = node.y() - height / 2;
                      finalStates[shapeId] = { x: topLeftX, y: topLeftY, width, height, rotation, fontSize: nextFont };
                    } else if (shapeData.type === 'rectangle') {
                      const width = Math.max(MIN_SHAPE_SIZE, Math.min((node.width?.() ?? shapeData.width) * scaleX, MAX_SHAPE_SIZE));
                      const height = Math.max(MIN_SHAPE_SIZE, Math.min((node.height?.() ?? shapeData.height) * scaleY, MAX_SHAPE_SIZE));
                      node.scaleX?.(1);
                      node.scaleY?.(1);
                      node.size?.({ width, height });
                      const topLeftX = node.x() - width / 2;
                      const topLeftY = node.y() - height / 2;
                      finalStates[shapeId] = { x: topLeftX, y: topLeftY, width, height, rotation };
                    } else {
                      const width = Math.max(MIN_SHAPE_SIZE, Math.min((node.width?.() ?? shapeData.width) * scaleX, MAX_SHAPE_SIZE));
                      const height = Math.max(MIN_SHAPE_SIZE, Math.min((node.height?.() ?? shapeData.height) * scaleY, MAX_SHAPE_SIZE));
                      node.scaleX?.(1);
                      node.scaleY?.(1);
                      node.size?.({ width, height });
                      finalStates[shapeId] = { x: node.x(), y: node.y(), width, height, rotation };
                    }
                  }
                });
                
                await finishEditingMultipleShapes(Array.from(editingShapes), finalStates);
                // Clear editing markers AFTER locks are released
                setEditingShapes(new Set());
              } else {
                // Single shape: use existing logic
                const node = e.target;
                if (shape.type === 'circle') {
                  const scaleX = node.scaleX?.() ?? 1;
                  const scaleY = node.scaleY?.() ?? 1;
                  const currDiameterX = (node.width?.() ?? Math.min(shape.width, shape.height)) * scaleX;
                  const currDiameterY = (node.height?.() ?? Math.min(shape.width, shape.height)) * scaleY;
                  const diameter = Math.max(MIN_SHAPE_SIZE, Math.min(Math.min(currDiameterX, currDiameterY), MAX_SHAPE_SIZE));
                  const radius = diameter / 2;
                  node.scaleX?.(1);
                  node.scaleY?.(1);
                  node.radius?.(radius);
                  const topLeftX = node.x() - radius;
                  const topLeftY = node.y() - radius;
                  await finishEditingShape(shape.id, { x: topLeftX, y: topLeftY, width: diameter, height: diameter, rotation: node.rotation?.() ?? 0 });
                } else if (shape.type === 'text') {
                  const baseWidth = node.width?.() ?? shape.width;
                  const baseHeight = node.height?.() ?? shape.height;
                  const scaleX = node.scaleX?.() ?? 1;
                  const scaleY = node.scaleY?.() ?? 1;
                  const width = Math.max(MIN_SHAPE_SIZE, Math.min(baseWidth * scaleX, MAX_SHAPE_SIZE));
                  const height = Math.max(MIN_SHAPE_SIZE, Math.min(baseHeight * scaleY, MAX_SHAPE_SIZE));
                  // Auto-fit option: compute font from final height; otherwise, use vertical scale
                  let nextFont;
                  if (shape.autoFitHeight) {
                    const padding = shape.padding ?? 4;
                    const usableHeight = Math.max(8, height - padding * 2);
                    nextFont = Math.max(8, Math.min(512, Math.round(usableHeight / (shape.lineHeight ?? 1.2))));
                  } else {
                    const scaleFactor = scaleY;
                    const currentFont = shape.fontSize || 18;
                    nextFont = Math.max(8, Math.min(512, Math.round(currentFont * scaleFactor)));
                  }
                  node.scaleX?.(1);
                  node.scaleY?.(1);
                  node.size?.({ width, height });
                  const topLeftX = node.x() - width / 2;
                  const topLeftY = node.y() - height / 2;
                  const rotationFinal = node.rotation?.() ?? 0;
                  console.log('[Text] Transform end', { id: shape.id, width, height, fontSize: nextFont, rotation: rotationFinal });
                  await finishEditingShape(shape.id, { x: topLeftX, y: topLeftY, width, height, rotation: rotationFinal, fontSize: nextFont });
                } else if (shape.type === 'rectangle') {
                  const scaleX = node.scaleX?.() ?? 1;
                  const scaleY = node.scaleY?.() ?? 1;
                  const width = Math.max(MIN_SHAPE_SIZE, Math.min((node.width?.() ?? shape.width) * scaleX, MAX_SHAPE_SIZE));
                  const height = Math.max(MIN_SHAPE_SIZE, Math.min((node.height?.() ?? shape.height) * scaleY, MAX_SHAPE_SIZE));
                  node.scaleX?.(1);
                  node.scaleY?.(1);
                  node.size?.({ width, height });
                  const topLeftX = node.x() - width / 2;
                  const topLeftY = node.y() - height / 2;
                  await finishEditingShape(shape.id, { x: topLeftX, y: topLeftY, width, height, rotation: node.rotation?.() ?? 0 });
                } else {
                  const scaleX = node.scaleX?.() ?? 1;
                  const scaleY = node.scaleY?.() ?? 1;
                  const width = Math.max(MIN_SHAPE_SIZE, Math.min((node.width?.() ?? shape.width) * scaleX, MAX_SHAPE_SIZE));
                  const height = Math.max(MIN_SHAPE_SIZE, Math.min((node.height?.() ?? shape.height) * scaleY, MAX_SHAPE_SIZE));
                  node.scaleX?.(1);
                  node.scaleY?.(1);
                  node.size?.({ width, height });
                  await finishEditingShape(shape.id, { x: node.x(), y: node.y(), width, height, rotation: node.rotation?.() ?? 0 });
                }
                // Clear editing markers AFTER lock is released
                setEditingShapes(new Set());
              }
            };

            return (
              <Group key={shape.id}>
                <ShapeNode
                  shape={shape}
                  scale={scale}
                  isSelected={isSelected}
                  isLockedByOther={lockedByOther}
                  isBeingEditedByMe={isBeingEditedByMe}
                  lockOwnerColor={lockOwnerColor}
                  onSelect={onSelect}
                  onDoubleClick={onDoubleClick}
                  onStartEdit={onStartEdit}
                  onDragMove={onDragMove}
                  onDragEnd={onDragEnd}
                  onTransform={onTransform}
                  onTransformEnd={onTransformEnd}
                  minSize={MIN_SHAPE_SIZE}
                  maxSize={MAX_SHAPE_SIZE}
                  isPanning={isPanning}
                />
                
                {/* Line endpoint handles - only show for selected lines */}
                {shape.type === 'line' && isSelected && !lockedByOther && (
                  <>
                    {/* Calculate actual endpoint positions */}
                    {(() => {
                      const points = shape.points || [0, 0, shape.width, shape.height];
                      const startX = shape.x + points[0];
                      const startY = shape.y + points[1];
                      const endX = shape.x + points[2];
                      const endY = shape.y + points[3];
                      const handleRadius = 8 / scale;
                      
                      return (
                        <>
                          {/* Start endpoint handle */}
                          <Circle
                            x={startX}
                            y={startY}
                            radius={handleRadius}
                            fill="#6366f1"
                            stroke="white"
                            strokeWidth={2 / scale}
                            draggable={!isPanning}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              setDraggingEndpoint({ shapeId: shape.id, endpoint: 'start' });
                              startEditingShape(shape.id);
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = stageRef.current;
                              if (!stage) return;
                              
                              // Get new position in canvas coordinates
                              const pointerPos = stage.getPointerPosition();
                              if (!pointerPos) return;
                              
                              const transform = stage.getAbsoluteTransform().copy().invert();
                              const newPos = transform.point(pointerPos);
                              
                              // Calculate new points array (moving start point, end stays fixed)
                              const points = shape.points || [0, 0, shape.width, shape.height];
                              const endX = shape.x + points[2];
                              const endY = shape.y + points[3];
                              
                              // New bounding box
                              const minX = Math.min(newPos.x, endX);
                              const minY = Math.min(newPos.y, endY);
                              const maxX = Math.max(newPos.x, endX);
                              const maxY = Math.max(newPos.y, endY);
                              
                              const newPoints = [
                                newPos.x - minX,
                                newPos.y - minY,
                                endX - minX,
                                endY - minY
                              ];
                              
                              updateShapeTemporary(shape.id, {
                                x: minX,
                                y: minY,
                                width: maxX - minX,
                                height: maxY - minY,
                                points: newPoints
                              });
                            }}
                            onDragEnd={async () => {
                              setDraggingEndpoint(null);
                              // Commit the final position
                              await finishEditingShape(shape.id);
                            }}
                          />
                          
                          {/* End endpoint handle */}
                          <Circle
                            x={endX}
                            y={endY}
                            radius={handleRadius}
                            fill="#6366f1"
                            stroke="white"
                            strokeWidth={2 / scale}
                            draggable={!isPanning}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              setDraggingEndpoint({ shapeId: shape.id, endpoint: 'end' });
                              startEditingShape(shape.id);
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = stageRef.current;
                              if (!stage) return;
                              
                              // Get new position in canvas coordinates
                              const pointerPos = stage.getPointerPosition();
                              if (!pointerPos) return;
                              
                              const transform = stage.getAbsoluteTransform().copy().invert();
                              const newPos = transform.point(pointerPos);
                              
                              // Calculate new points array (moving end point, start stays fixed)
                              const points = shape.points || [0, 0, shape.width, shape.height];
                              const startX = shape.x + points[0];
                              const startY = shape.y + points[1];
                              
                              // New bounding box
                              const minX = Math.min(startX, newPos.x);
                              const minY = Math.min(startY, newPos.y);
                              const maxX = Math.max(startX, newPos.x);
                              const maxY = Math.max(startY, newPos.y);
                              
                              const newPoints = [
                                startX - minX,
                                startY - minY,
                                newPos.x - minX,
                                newPos.y - minY
                              ];
                              
                              updateShapeTemporary(shape.id, {
                                x: minX,
                                y: minY,
                                width: maxX - minX,
                                height: maxY - minY,
                                points: newPoints
                              });
                            }}
                            onDragEnd={async () => {
                              setDraggingEndpoint(null);
                              // Commit the final position
                              await finishEditingShape(shape.id);
                            }}
                          />
                        </>
                      );
                    })()}
                  </>
                )}
                
              {/* Lock visual indicator removed - lock borders and functionality remain */}
            </Group>
            );
          })}
          
          {/* Selection Group - Multi-selection optimization (O(1) instead of O(N)) */}
          {selectedIds.size > 1 && selectedShapes.length > 0 && (
            <SelectionGroupNode
              key={`group-${selectedIds.size}`}
              shapes={selectedShapes}
              onDragStart={handleGroupDragStart}
              onDragMove={handleGroupDragMove}
              onDragEnd={handleGroupDragEnd}
              onTransformEnd={handleGroupTransformEnd}
              isPanning={isPanning}
            />
          )}
          
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            boundBoxFunc={(oldBox, newBox) => {
              if (
                newBox.width < MIN_SHAPE_SIZE ||
                newBox.height < MIN_SHAPE_SIZE ||
                newBox.width > MAX_SHAPE_SIZE ||
                newBox.height > MAX_SHAPE_SIZE
              ) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
        
        {/* Cursor layer - renders other users' cursors */}
        <Layer listening={false}>
          {Object.entries(cursors).map(([userId, cursor]) => (
            <Cursor
              key={userId}
              x={cursor.x}
              y={cursor.y}
              color={cursor.color}
              displayName={cursor.displayName}
              scale={scale}
            />
          ))}
        </Layer>
      </Stage>
      
      {/* Left Panel - Full height, Figma-style */}
      <LeftPanel />
      
      {/* Zoom Controls - Bottom-left, adjusted for left panel */}
      <div style={{ position: 'absolute', left: '256px', bottom: '20px', zIndex: 1000 }}>
        <CanvasControls />
      </div>
      
      {/* Right Panel - Properties */}
      <StylePanel />
      
      <CanvasHelpOverlay />
      
      {/* Text editing overlay */}
      {editingTextId && (() => {
        const shape = shapes.find(s => s.id === editingTextId);
        if (!shape) return null;
        
        const stage = stageRef.current;
        if (!stage) return null;
        
        // Calculate screen position from canvas coordinates
        // Shape x,y are stored as top-left, but rendered with offset (center)
        const stagePos = stage.container().getBoundingClientRect();
        // Use the stage's absolute transform to project canvas coords to screen
        const abs = stage.getAbsoluteTransform();
        const topLeft = abs.point({ x: shape.x, y: shape.y });
        const bottomRight = abs.point({ x: shape.x + shape.width, y: shape.y + shape.height });
        const screenX = stagePos.left + topLeft.x;
        const screenY = stagePos.top + topLeft.y;
        const screenWidth = bottomRight.x - topLeft.x;
        const screenHeight = bottomRight.y - topLeft.y;
        
        return (
          <textarea
            ref={textInputRef}
            value={editingTextValue}
            onChange={(e) => setEditingTextValue(e.target.value)}
            onBlur={finishTextEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelTextEdit();
              } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                finishTextEdit();
              }
            }}
            style={{
              position: 'fixed',
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: `${screenWidth}px`,
              height: `${screenHeight}px`,
              fontSize: `${(shape.fontSize || 18) * scale}px`,
              fontFamily: shape.fontFamily || 'Inter, system-ui',
              fontStyle: (shape.fontStyle || 'normal').includes('italic') ? 'italic' : 'normal',
              fontWeight: (shape.fontStyle || 'normal').includes('bold') ? 'bold' : 'normal',
              textDecoration: shape.textDecoration || '',
              color: shape.fill || '#111827',
              textAlign: shape.align || 'left',
              border: '2px solid #0066ff',
              borderRadius: '4px',
              padding: '4px',
              backgroundColor: 'white',
              resize: 'none',
              outline: 'none',
              zIndex: 10001,
              // Apply rotation around the center of the textarea
              transform: `translate(${screenWidth / 2}px, ${screenHeight / 2}px) rotate(${shape.rotation || 0}deg) translate(${-screenWidth / 2}px, ${-screenHeight / 2}px)`,
              transformOrigin: 'top left',
              lineHeight: 1.2,
            }}
          />
        );
      })()}
      
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 10000,
          pointerEvents: 'none',
          animation: 'slideUp 0.3s ease-out',
        }}>
          {toast}
        </div>
      )}
      
      {/* Toast animation */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Canvas;
