import { useContext, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { CanvasContext } from '../../contexts/CanvasContext';
import { isShapeLockedByOther } from '../../services/shapes';
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

const Canvas = () => {
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
    deleteShape,
    currentUser,
    loading,
  } = useContext(CanvasContext);
  const transformerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);

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
    return currentUser && isShapeLockedByOther(shape, currentUser.uid);
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

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        draggable={isPanning}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
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
            const lockedByOther = isLockedByOther(shape);
            const isSelected = selectedId === shape.id;
            
            return (
              <Rect
                key={shape.id}
                id={shape.id}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={shape.fill}
                opacity={lockedByOther ? 0.5 : 1}
                draggable={!isPanning && !lockedByOther}
                onClick={() => {
                  if (!isPanning && !lockedByOther) {
                    setSelectedId(shape.id);
                  }
                }}
                onTap={() => {
                  if (!isPanning && !lockedByOther) {
                    setSelectedId(shape.id);
                  }
                }}
                stroke={
                  isSelected 
                    ? '#0066ff' 
                    : lockedByOther 
                    ? '#ff6b6b' 
                    : undefined
                }
                strokeWidth={isSelected || lockedByOther ? 3 : 0}
                dash={lockedByOther ? [10, 5] : undefined}
                onDragEnd={(e) => {
                  if (lockedByOther) return;
                  
                  const node = e.target;
                  // Constrain to canvas boundaries
                  const newX = Math.max(0, Math.min(node.x(), CANVAS_WIDTH - node.width()));
                  const newY = Math.max(0, Math.min(node.y(), CANVAS_HEIGHT - node.height()));
                  
                  node.position({ x: newX, y: newY });

                  // Update shape position in context state
                  updateShape(shape.id, { x: newX, y: newY });
                }}
                onTransformEnd={(e) => {
                  if (lockedByOther) return;
                  
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

                  updateShape(shape.id, {
                    x: constrainedX,
                    y: constrainedY,
                    width,
                    height,
                  });
                }}
              />
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
      </Stage>
      
      <CanvasControls />
      <CanvasToolbar />
      <CanvasHelpOverlay />
    </div>
  );
};

export default Canvas;
