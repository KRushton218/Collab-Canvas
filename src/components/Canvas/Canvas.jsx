import { useContext, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Transformer, Group, Path } from 'react-konva';
import { CanvasContext } from '../../contexts/CanvasContext';
import { isShapeLockedByOther } from '../../services/shapes';
import { useCursors } from '../../hooks/useCursors';
import { Cursor } from '../Collaboration/Cursor';
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
    updateShape,
    updateShapeTemporary,
    startEditingShape,
    finishEditingShape,
    deleteShape,
    currentUser,
    loading,
    locks,
  } = useContext(CanvasContext);
  const transformerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  
  // Track which shapes are being actively edited by this user
  // This ensures the lock border persists throughout the drag/transform
  const [editingShapes, setEditingShapes] = useState(new Set());
  const editingShapesRef = useRef(new Set());
  
  // Toast notification state
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  
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

    // Deselect if clicking on stage background
    if (e.target === e.target.getStage()) {
      deselectShape();
    }
  };

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteShape(selectedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteShape]);

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
    }
  }, [selectedId, shapes, stageRef]);

  // Handle spacebar pan mode
  useEffect(() => {
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
    container.style.cursor = isPanning ? 'grab' : 'default';

    return () => {
      container.style.cursor = 'default';
    };
  }, [isPanning, stageRef]);

  const handleDragStart = () => {
    const stage = stageRef.current;
    if (stage) {
      stage.container().style.cursor = 'grabbing';
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
      
      // Update cursor position in Firebase
      updateMyCursor(canvasPos.x, canvasPos.y);
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
          cursor: url('${customCursorSVG}') 1 1, auto !important;
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
            
            return (
              <Group key={shape.id}>
                <Rect
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill={shape.fill}
                  opacity={lockedByOther ? 0.6 : 1}
                  draggable={!isPanning && !lockedByOther}
                  onClick={() => {
                    if (isPanning) return;
                    
                    if (lockedByOther) {
                      const ownerName = getLockOwnerName(shape);
                      showToast(`🔒 This shape is being edited by ${ownerName}`);
                    } else {
                      setSelectedId(shape.id);
                    }
                  }}
                  onTap={() => {
                    if (isPanning) return;
                    
                    if (lockedByOther) {
                      const ownerName = getLockOwnerName(shape);
                      showToast(`🔒 This shape is being edited by ${ownerName}`);
                    } else {
                      setSelectedId(shape.id);
                    }
                  }}
                  stroke={
                    isSelected 
                      ? '#0066ff' 
                      : (lockedByOther || isBeingEditedByMe) && lockOwnerColor
                      ? lockOwnerColor
                      : undefined
                  }
                  strokeWidth={
                    isSelected 
                      ? scaledStrokeWidth * 0.5  // Selected: thinner blue border
                      : (lockedByOther || isBeingEditedByMe)
                      ? scaledStrokeWidth  // Locked: thick colored border
                      : 0
                  }
                  dash={(lockedByOther || isBeingEditedByMe) ? [15 / scale, 8 / scale] : undefined}
                onDragStart={async (e) => {
                  if (lockedByOther) return;
                  
                  // Start editing session (lock + copy to RTDB)
                  const success = await startEditingShape(shape.id);
                  if (success) {
                    setEditingShapes((prev) => new Set(prev).add(shape.id));
                  } else {
                    // Failed to acquire lock, cancel drag
                    e.target.stopDrag();
                  }
                }}
                onDragMove={(e) => {
                  if (lockedByOther || !editingShapesRef.current.has(shape.id)) return;
                  
                  const node = e.target;
                  // Constrain to canvas boundaries during drag
                  const newX = Math.max(0, Math.min(node.x(), CANVAS_WIDTH - node.width()));
                  const newY = Math.max(0, Math.min(node.y(), CANVAS_HEIGHT - node.height()));
                  
                  node.position({ x: newX, y: newY });
                  
                  // Update cursor position to follow the shape (center of shape)
                  const centerX = newX + node.width() / 2;
                  const centerY = newY + node.height() / 2;
                  updateMyCursor(centerX, centerY);
                  
                  // Update position in RTDB (temporary) - throttled automatically
                  updateShapeTemporary(shape.id, { x: newX, y: newY });
                }}
                onDragEnd={async (e) => {
                  if (lockedByOther || !editingShapes.has(shape.id)) return;
                  
                  const node = e.target;
                  // Final position constraint
                  const newX = Math.max(0, Math.min(node.x(), CANVAS_WIDTH - node.width()));
                  const newY = Math.max(0, Math.min(node.y(), CANVAS_HEIGHT - node.height()));
                  
                  node.position({ x: newX, y: newY });

                  // Finish editing with final position (commit to Firestore and clear RTDB)
                  await finishEditingShape(shape.id, {
                    x: newX,
                    y: newY,
                    width: node.width(),
                    height: node.height()
                  });
                  setEditingShapes((prev) => {
                    const next = new Set(prev);
                    next.delete(shape.id);
                    return next;
                  });
                }}
                onTransformStart={async () => {
                  if (lockedByOther) return;
                  
                  // Start editing session (lock + copy to RTDB)
                  const success = await startEditingShape(shape.id);
                  if (success) {
                    setEditingShapes((prev) => new Set(prev).add(shape.id));
                  }
                }}
                onTransform={(e) => {
                  if (lockedByOther || !editingShapesRef.current.has(shape.id)) return;
                  
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();

                  const width = Math.max(
                    MIN_SHAPE_SIZE,
                    Math.min(node.width() * scaleX, MAX_SHAPE_SIZE),
                  );
                  const height = Math.max(
                    MIN_SHAPE_SIZE,
                    Math.min(node.height() * scaleY, MAX_SHAPE_SIZE),
                  );

                  // Update cursor position to follow the shape (center of shape)
                  const centerX = node.x() + width / 2;
                  const centerY = node.y() + height / 2;
                  updateMyCursor(centerX, centerY);

                  // Update RTDB with current transform - throttled automatically
                  updateShapeTemporary(shape.id, {
                    x: node.x(),
                    y: node.y(),
                    width,
                    height,
                  });
                }}
                onTransformEnd={async (e) => {
                  if (lockedByOther || !editingShapes.has(shape.id)) return;
                  
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();

                  const width = Math.max(
                    MIN_SHAPE_SIZE,
                    Math.min(node.width() * scaleX, MAX_SHAPE_SIZE),
                  );
                  const height = Math.max(
                    MIN_SHAPE_SIZE,
                    Math.min(node.height() * scaleY, MAX_SHAPE_SIZE),
                  );

                  node.scaleX(1);
                  node.scaleY(1);
                  node.size({ width, height });

                  const constrainedX = Math.max(0, Math.min(node.x(), CANVAS_WIDTH - width));
                  const constrainedY = Math.max(0, Math.min(node.y(), CANVAS_HEIGHT - height));

                  node.position({ x: constrainedX, y: constrainedY });

                  // Finish editing with final state (commit to Firestore and clear RTDB)
                  await finishEditingShape(shape.id, {
                    x: constrainedX,
                    y: constrainedY,
                    width,
                    height
                  });
                  setEditingShapes((prev) => {
                    const next = new Set(prev);
                    next.delete(shape.id);
                    return next;
                  });
                }}
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
            rotateEnabled={false}
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
      <CanvasHelpOverlay />
      
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
