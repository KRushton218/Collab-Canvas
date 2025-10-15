import { useContext, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Transformer, Group, Path, Line, Circle, Text as KonvaText } from 'react-konva';
import { CanvasContext } from '../../contexts/CanvasContext';
import { isShapeLockedByOther } from '../../services/shapes';
import { useCursors } from '../../hooks/useCursors';
import { Cursor } from '../Collaboration/Cursor';
import ShapeNode from './ShapeNode';
import { RectangleObject, CircleObject, LineObject, TextObject } from '../../models/CanvasObject';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  CANVAS_BG_COLOR,
  MIN_ZOOM,
  MAX_ZOOM,
  MIN_SHAPE_SIZE,
  MAX_SHAPE_SIZE,
} from '../../utils/constants';
import CanvasControls from './CanvasControls';
import CanvasToolbar from './CanvasToolbar';
import CanvasHelpOverlay from './CanvasHelpOverlay';
import StylePanel from './StylePanel';

const Canvas = ({ currentUserColor = '#000000' }) => {
  const {
    shapes,
    selectedId,
    setSelectedId,
    deselectShape,
    scale,
    setScale,
    position,
    setPosition,
    stageRef,
    addShape,
    updateShape,
    updateShapeTemporary,
    startEditingShape,
    finishEditingShape,
    deleteShape,
    currentUser,
    loading,
    locks,
    activeTool,
    setActiveTool,
    currentFill,
  } = useContext(CanvasContext);
  const transformerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStart, setCreationStart] = useState(null); // {x,y}
  const [creationDraft, setCreationDraft] = useState(null); // { type, x,y,width,height,points, fill }
  
  // Track which shapes are being actively edited by this user
  // This ensures the lock border persists throughout the drag/transform
  const [editingShapes, setEditingShapes] = useState(new Set());
  const editingShapesRef = useRef(new Set());
  
  // Toast notification state
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  
  // Text editing state
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const textInputRef = useRef(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    editingShapesRef.current = editingShapes;
  }, [editingShapes]);
  
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

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't delete shape if we're editing text - let the textarea handle the key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingTextId) {
        e.preventDefault();
        deleteShape(selectedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, editingTextId, deleteShape]);

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

  // Sync transformer with selected node
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) {
      return;
    }

    const selectedNode = selectedId ? stage.findOne(`#${selectedId}`) : null;
    if (selectedNode) {
      transformer.nodes([selectedNode]);
      transformer.getLayer()?.batchDraw();
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      // When deselecting, ensure any local editing borders are cleared
      setEditingShapes(new Set());
    }
  }, [selectedId, shapes, stageRef]);

  // Handle spacebar pan mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !isEditableElement(e.target)) {
        e.preventDefault();
        setIsPanning(true);
      }
      if (!isEditableElement(e.target)) {
        if (e.key === 'Escape') {
          setIsPanning(false);
          // return to select tool
          if (typeof setActiveTool === 'function') {
            setActiveTool('select');
          }
        }
        // Tool shortcuts
        const key = e.key.toLowerCase();
        if (key === 'v') setActiveTool?.('select');
        if (key === 'r') setActiveTool?.('rectangle');
        if (key === 'c') setActiveTool?.('circle');
        if (key === 'l') setActiveTool?.('line');
        if (key === 't') setActiveTool?.('text');
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
        const startX = Math.max(0, Math.min(creationStart.x, CANVAS_WIDTH));
        const startY = Math.max(0, Math.min(creationStart.y, CANVAS_HEIGHT));
        const currentX = Math.max(0, Math.min(canvasPos.x, CANVAS_WIDTH));
        const currentY = Math.max(0, Math.min(canvasPos.y, CANVAS_HEIGHT));

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

      // Update cursor position in Firebase
      updateMyCursor(canvasPos.x, canvasPos.y);
    }
  };

  // Begin creation on mouse down when in tool mode
  const handleMouseDown = (e) => {
    if (!stageRef.current) return;
    if (isPanning) return;
    if (!activeTool || activeTool === 'select') return;
    // Only start creation if clicking on empty canvas (not on an existing node)
    if (e.target !== e.target.getStage()) return;

    const stage = stageRef.current;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const canvasPos = transform.point(pointerPosition);

    setIsCreating(true);
    setCreationStart({ x: canvasPos.x, y: canvasPos.y });
    setCreationDraft(null);
  };

  // Commit creation on mouse up: if no drag, create default size at click; else use draft
  const handleMouseUp = async (e) => {
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
        const x = Math.max(0, Math.min(start.x - size / 2, CANVAS_WIDTH - size));
        const y = Math.max(0, Math.min(start.y - size / 2, CANVAS_HEIGHT - size));

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
          const obj = new TextObject({ x, y, width: 160, height: 40, fill: '#111827', text: '' });
          const newShapeId = await addShape(obj.toRecord());
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
        <Layer>
          {/* Canvas background - the 5000x5000 working area */}
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill={CANVAS_BG_COLOR}
            listening={false}
          />
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
          
          {/* Shapes will be rendered here */}
          {shapes.map((shape) => {
            // Check if this shape is being actively edited by current user
            const isBeingEditedByMe = editingShapesRef.current.has(shape.id);
            
            // Determine lock state - either from RTDB or local editing state
            const lockedByOther = isLockedByOther(shape);
            const isSelected = selectedId === shape.id;
            
            // If we're editing it locally, show our color border
            // Otherwise show the lock owner's color
            const isLocked = isBeingEditedByMe || !!shape.lockedBy;
            const lockOwnerColor = isBeingEditedByMe 
              ? currentUserColor 
              : getLockOwnerColor(shape);
            
            // Calculate stroke width that scales inversely with zoom
            // Base width of 6px (scaled to maintain visibility when zoomed out)
            const baseStrokeWidth = 6;
            const scaledStrokeWidth = baseStrokeWidth / scale;
            
            // Lock icon size and position (scales with zoom)
            const lockIconSize = 28 / scale; // Base 28px (larger for visibility)
            const lockIconOffset = 12 / scale; // 12px from corner
            
            const onSelect = () => {
              if (isPanning) return;
              if (lockedByOther) {
                const ownerName = getLockOwnerName(shape);
                showToast(`🔒 This shape is being edited by ${ownerName}`);
              } else {
                setSelectedId(shape.id);
              }
            };
            
            const onDoubleClick = () => {
              if (shape.type === 'text' && !lockedByOther && !isPanning) {
                setEditingTextId(shape.id);
                setEditingTextValue(shape.text || 'Text');
                // Focus will happen in useEffect
              }
            };

            const onStartEdit = async (e) => {
              if (lockedByOther || isPanning) return;
              const success = await startEditingShape(shape.id);
              if (success) {
                // Ensure only the currently edited shape remains marked as editing
                setEditingShapes(new Set([shape.id]));
              } else {
                e?.target?.stopDrag?.();
              }
            };

            const onDragMove = (e) => {
              if (lockedByOther || isPanning || !editingShapesRef.current.has(shape.id)) return;
              const node = e.target;
              if (shape.type === 'circle') {
                const radius = node.radius?.() ?? Math.min(shape.width, shape.height) / 2;
                const diameter = radius * 2;
                const topLeftX = Math.max(0, Math.min(node.x() - radius, CANVAS_WIDTH - diameter));
                const topLeftY = Math.max(0, Math.min(node.y() - radius, CANVAS_HEIGHT - diameter));
                node.position({ x: topLeftX + radius, y: topLeftY + radius });
                updateMyCursor(node.x(), node.y());
                updateShapeTemporary(shape.id, { x: topLeftX, y: topLeftY, width: diameter, height: diameter });
              } else {
                const width = node.width?.() ?? shape.width;
                const height = node.height?.() ?? shape.height;
                const newX = Math.max(0, Math.min(node.x(), CANVAS_WIDTH - width));
                const newY = Math.max(0, Math.min(node.y(), CANVAS_HEIGHT - height));
                node.position({ x: newX, y: newY });
                const centerX = newX + (width || 0) / 2;
                const centerY = newY + (height || 0) / 2;
                updateMyCursor(centerX, centerY);
                updateShapeTemporary(shape.id, { x: newX, y: newY });
              }
            };

            const onDragEnd = async (e) => {
              if (lockedByOther || isPanning || !editingShapes.has(shape.id)) return;
              const node = e.target;
              if (shape.type === 'circle') {
                const radius = node.radius?.() ?? Math.min(shape.width, shape.height) / 2;
                const diameter = radius * 2;
                let topLeftX = node.x() - radius;
                let topLeftY = node.y() - radius;
                topLeftX = Math.max(0, Math.min(topLeftX, CANVAS_WIDTH - diameter));
                topLeftY = Math.max(0, Math.min(topLeftY, CANVAS_HEIGHT - diameter));
                node.position({ x: topLeftX + radius, y: topLeftY + radius });
                await finishEditingShape(shape.id, { x: topLeftX, y: topLeftY, width: diameter, height: diameter });
              } else {
                const width = node.width?.() ?? shape.width;
                const height = node.height?.() ?? shape.height;
                const newX = Math.max(0, Math.min(node.x(), CANVAS_WIDTH - width));
                const newY = Math.max(0, Math.min(node.y(), CANVAS_HEIGHT - height));
                node.position({ x: newX, y: newY });
                await finishEditingShape(shape.id, { x: newX, y: newY, width, height });
              }
              // Clear all editing markers to avoid lingering borders
              setEditingShapes(new Set());
            };

            const onTransform = (e) => {
              if (lockedByOther || isPanning || !editingShapesRef.current.has(shape.id)) return;
              const node = e.target;
              const scaleX = node.scaleX?.() ?? 1;
              const scaleY = node.scaleY?.() ?? 1;
              const rotation = node.rotation?.() ?? 0;
              
              // Detect if this is a pure rotation (no scale change)
              const isPureRotation = Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01;
              
              if (isPureRotation) {
                // Pure rotation: only send rotation, don't update x/y
                updateMyCursor(node.x() + (node.width?.() ?? shape.width) / 2, node.y() + (node.height?.() ?? shape.height) / 2);
                updateShapeTemporary(shape.id, { rotation });
              } else if (shape.type === 'circle') {
                const currDiameterX = (node.width?.() ?? Math.min(shape.width, shape.height)) * scaleX;
                const currDiameterY = (node.height?.() ?? Math.min(shape.width, shape.height)) * scaleY;
                const diameter = Math.max(MIN_SHAPE_SIZE, Math.min(Math.min(currDiameterX, currDiameterY), MAX_SHAPE_SIZE));
                const radius = diameter / 2;
                const topLeftX = node.x() - radius;
                const topLeftY = node.y() - radius;
                updateMyCursor(node.x(), node.y());
                updateShapeTemporary(shape.id, { x: topLeftX, y: topLeftY, width: diameter, height: diameter, rotation });
              } else if (shape.type === 'text') {
                const baseWidth = node.width?.() ?? shape.width;
                const baseHeight = node.height?.() ?? shape.height;
                const width = Math.max(MIN_SHAPE_SIZE, Math.min(baseWidth * scaleX, MAX_SHAPE_SIZE));
                const height = Math.max(MIN_SHAPE_SIZE, Math.min(baseHeight * scaleY, MAX_SHAPE_SIZE));
                const scaleFactor = Math.max(scaleX, scaleY);
                const currentFont = shape.fontSize || 18;
                const nextFont = Math.max(8, Math.min(512, Math.round(currentFont * scaleFactor)));
                const centerX = node.x() + width / 2;
                const centerY = node.y() + height / 2;
                updateMyCursor(centerX, centerY);
                updateShapeTemporary(shape.id, { x: node.x(), y: node.y(), width, height, fontSize: nextFont, rotation });
              } else {
                const width = Math.max(MIN_SHAPE_SIZE, Math.min((node.width?.() ?? shape.width) * scaleX, MAX_SHAPE_SIZE));
                const height = Math.max(MIN_SHAPE_SIZE, Math.min((node.height?.() ?? shape.height) * scaleY, MAX_SHAPE_SIZE));
                const centerX = node.x() + width / 2;
                const centerY = node.y() + height / 2;
                updateMyCursor(centerX, centerY);
                updateShapeTemporary(shape.id, { x: node.x(), y: node.y(), width, height, rotation });
              }
            };

            const onTransformEnd = async (e) => {
              if (lockedByOther || isPanning || !editingShapes.has(shape.id)) return;
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
                let topLeftX = node.x() - radius;
                let topLeftY = node.y() - radius;
                topLeftX = Math.max(0, Math.min(topLeftX, CANVAS_WIDTH - diameter));
                topLeftY = Math.max(0, Math.min(topLeftY, CANVAS_HEIGHT - diameter));
                node.position({ x: topLeftX + radius, y: topLeftY + radius });
                await finishEditingShape(shape.id, { x: topLeftX, y: topLeftY, width: diameter, height: diameter, rotation: node.rotation?.() ?? 0 });
              } else if (shape.type === 'text') {
                const baseWidth = node.width?.() ?? shape.width;
                const baseHeight = node.height?.() ?? shape.height;
                const scaleX = node.scaleX?.() ?? 1;
                const scaleY = node.scaleY?.() ?? 1;
                const width = Math.max(MIN_SHAPE_SIZE, Math.min(baseWidth * scaleX, MAX_SHAPE_SIZE));
                const height = Math.max(MIN_SHAPE_SIZE, Math.min(baseHeight * scaleY, MAX_SHAPE_SIZE));
                const scaleFactor = Math.max(scaleX, scaleY);
                const currentFont = shape.fontSize || 18;
                const nextFont = Math.max(8, Math.min(512, Math.round(currentFont * scaleFactor)));
                node.scaleX?.(1);
                node.scaleY?.(1);
                node.size?.({ width, height });
                const constrainedX = Math.max(0, Math.min(node.x(), CANVAS_WIDTH - width));
                const constrainedY = Math.max(0, Math.min(node.y(), CANVAS_HEIGHT - height));
                node.position({ x: constrainedX, y: constrainedY });
                await finishEditingShape(shape.id, { x: constrainedX, y: constrainedY, width, height, rotation: node.rotation?.() ?? 0, fontSize: nextFont });
              } else {
                const scaleX = node.scaleX?.() ?? 1;
                const scaleY = node.scaleY?.() ?? 1;
                const width = Math.max(MIN_SHAPE_SIZE, Math.min((node.width?.() ?? shape.width) * scaleX, MAX_SHAPE_SIZE));
                const height = Math.max(MIN_SHAPE_SIZE, Math.min((node.height?.() ?? shape.height) * scaleY, MAX_SHAPE_SIZE));
                node.scaleX?.(1);
                node.scaleY?.(1);
                node.size?.({ width, height });
                const constrainedX = Math.max(0, Math.min(node.x(), CANVAS_WIDTH - width));
                const constrainedY = Math.max(0, Math.min(node.y(), CANVAS_HEIGHT - height));
                node.position({ x: constrainedX, y: constrainedY });
                await finishEditingShape(shape.id, { x: constrainedX, y: constrainedY, width, height, rotation: node.rotation?.() ?? 0 });
              }
              // Clear all editing markers to avoid lingering borders
              setEditingShapes(new Set());
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
                
              {/* Lock icon - only show for shapes locked by OTHER users, not yourself */}
              {isLocked && lockOwnerColor && !isBeingEditedByMe && (
                <Group
                  x={shape.x + lockIconOffset}
                  y={shape.y + lockIconOffset}
                  listening={false}
                >
                  {/* White background circle for visibility */}
                  <Rect
                    x={0}
                    y={0}
                    width={lockIconSize}
                    height={lockIconSize}
                    fill="white"
                    cornerRadius={lockIconSize / 4}
                    shadowColor="black"
                    shadowBlur={3 / scale}
                    shadowOpacity={0.4}
                  />
                  
                  {/* Material Design Lock Icon (padlock) */}
                  <Path
                    data="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
                    fill={lockOwnerColor}
                    scaleX={lockIconSize / 24}
                    scaleY={lockIconSize / 24}
                  />
                </Group>
              )}
            </Group>
            );
          })}
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
      
      <CanvasControls />
      <CanvasToolbar />
      <StylePanel />
      <CanvasHelpOverlay />
      
      {/* Text editing overlay */}
      {editingTextId && (() => {
        const shape = shapes.find(s => s.id === editingTextId);
        if (!shape) return null;
        
        const stage = stageRef.current;
        if (!stage) return null;
        
        // Calculate screen position from canvas coordinates
        const stagePos = stage.container().getBoundingClientRect();
        const screenX = stagePos.left + (shape.x + position.x) * scale;
        const screenY = stagePos.top + (shape.y + position.y) * scale;
        const screenWidth = shape.width * scale;
        const screenHeight = shape.height * scale;
        
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
              transform: `rotate(${shape.rotation || 0}deg)`,
              transformOrigin: 'top left',
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
