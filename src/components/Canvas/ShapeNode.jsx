import { Group, Rect, Circle, Line, Text as KonvaText, Path, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

// Unified renderer and interaction wrapper for a shape node
// Delegates events and locking to parent via provided handlers

const ShapeNode = ({
  shape,
  scale,
  isSelected,
  isLockedByOther,
  isBeingEditedByMe,
  lockOwnerColor,
  onSelect,
  onStartEdit,
  onDragMove,
  onDragEnd,
  onTransform,
  onTransformEnd,
  minSize,
  maxSize,
  isPanning,
}) => {
  const nodeRef = useRef(null);

  // Lock/selection visuals
  const baseStrokeWidth = 6;
  const scaledStrokeWidth = baseStrokeWidth / scale;

  const strokeColor = isSelected
    ? '#0066ff'
    : (isLockedByOther || isBeingEditedByMe) && lockOwnerColor
    ? lockOwnerColor
    : undefined;

  const strokeWidth = isSelected
    ? scaledStrokeWidth * 0.5
    : (isLockedByOther || isBeingEditedByMe)
    ? scaledStrokeWidth
    : 0;

  const dash = (isLockedByOther || isBeingEditedByMe) ? [15 / scale, 8 / scale] : undefined;

  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    opacity: isLockedByOther ? 0.6 : 1,
    draggable: !isLockedByOther && !isPanning,
    onClick: onSelect,
    onTap: onSelect,
    stroke: strokeColor,
    strokeWidth,
    dash,
    rotation: shape.rotation || 0,
  };

  const handleDragMove = (e) => onDragMove?.(e);
  const handleDragEnd = (e) => onDragEnd?.(e);
  const handleTransform = (e) => onTransform?.(e);
  const handleTransformEnd = (e) => onTransformEnd?.(e);

  switch (shape.type) {
    case 'rectangle':
      return (
        <Rect
          ref={nodeRef}
          {...commonProps}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          cornerRadius={shape.cornerRadius || 0}
          onDragStart={onStartEdit}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onTransformStart={onStartEdit}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
        />
      );
    case 'circle': {
      // Render circle based on bounding box
      const radius = Math.min(shape.width, shape.height) / 2;
      return (
        <Circle
          ref={nodeRef}
          {...commonProps}
          x={shape.x + radius}
          y={shape.y + radius}
          radius={radius}
          fill={shape.fill}
          onDragStart={onStartEdit}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onTransformStart={onStartEdit}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
        />
      );
    }
    case 'line':
      return (
        <Line
          ref={nodeRef}
          {...commonProps}
          points={shape.points || [shape.x, shape.y, shape.x + shape.width, shape.y + shape.height]}
          stroke={shape.stroke || strokeColor || '#374151'}
          strokeWidth={shape.strokeWidth || 2}
          lineCap="round"
          lineJoin="round"
          draggable={!isLockedByOther}
          onDragStart={onStartEdit}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      );
    case 'text':
      return (
        <KonvaText
          ref={nodeRef}
          {...commonProps}
          width={shape.width}
          height={shape.height}
          text={shape.text || 'Text'}
          fontSize={shape.fontSize || 18}
          fontFamily={shape.fontFamily || 'Inter, system-ui'}
          fill={shape.fill || '#111827'}
          align={shape.align || 'left'}
          onDragStart={onStartEdit}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onTransformStart={onStartEdit}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
        />
      );
    default:
      return null;
  }
};

export default ShapeNode;


