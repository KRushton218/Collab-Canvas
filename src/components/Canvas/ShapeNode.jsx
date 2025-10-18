import { Group, Rect, Circle, Line, Text as KonvaText, Path, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

// Unified renderer and interaction wrapper for a shape node
// Delegates events and locking to parent via provided handlers

const ShapeNode = ({
  shape,
  isSelected,
  isLockedByOther,
  isBeingEditedByMe,
  lockOwnerColor,
  onSelect,
  onDoubleClick,
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

  // Lock/selection visuals and default accessibility border
  // Keep overlay stroke proportional to shape size (scales with zoom)
  const baseOverlayStrokeWidth = 6;

  const isLockOrSelect = isSelected || isLockedByOther || isBeingEditedByMe;
  const overlayStrokeColor = isSelected
    ? '#0066ff'
    : (isLockedByOther || isBeingEditedByMe) && lockOwnerColor
    ? lockOwnerColor
    : undefined;

  const overlayStrokeWidth = isSelected
    ? baseOverlayStrokeWidth * 0.5
    : (isLockedByOther || isBeingEditedByMe)
    ? baseOverlayStrokeWidth
    : 0;

  const dash = (isLockedByOther || isBeingEditedByMe) ? [15, 8] : undefined;

  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    opacity: isLockedByOther ? 0.6 : 1,
    draggable: isSelected && !isLockedByOther && !isPanning,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: onDoubleClick,
    onDblTap: onDoubleClick,
    dash,
    rotation: shape.rotation || 0,
  };
  
  // For rectangles, we need to set offset to rotate around center
  const getRectOffsetProps = (width, height) => ({
    offsetX: width / 2,
    offsetY: height / 2,
    x: shape.x + width / 2,
    y: shape.y + height / 2,
  });

  const handleDragMove = (e) => onDragMove?.(e);
  const handleDragEnd = (e) => onDragEnd?.(e);
  const handleTransform = (e) => onTransform?.(e);
  const handleTransformEnd = (e) => onTransformEnd?.(e);

  switch (shape.type) {
    case 'rectangle':
      return (
        <Group
          ref={nodeRef}
          {...commonProps}
          {...getRectOffsetProps(shape.width, shape.height)}
          width={shape.width}
          height={shape.height}
          onDragStart={onStartEdit}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onTransformStart={onStartEdit}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
        >
          {/* Selection/Lock indicator (outer border) */}
          {isLockOrSelect && (
            <Rect
              x={0}
              y={0}
              width={shape.width}
              height={shape.height}
              fill="transparent"
              stroke={overlayStrokeColor}
              strokeWidth={overlayStrokeWidth}
              dash={dash}
              cornerRadius={shape.cornerRadius || 0}
              listening={false}
            />
          )}
          {/* Actual shape with its own border */}
          <Rect
            x={0}
            y={0}
            width={shape.width}
            height={shape.height}
            fill={shape.fill}
            stroke={shape.stroke || '#e5e7eb'}
            strokeWidth={shape.strokeWidth || 1}
            cornerRadius={shape.cornerRadius || 0}
            listening={true}
          />
        </Group>
      );
    case 'circle': {
      // Render circle based on bounding box
      // Use offset to anchor to top-left corner during transforms
      const radius = Math.min(shape.width, shape.height) / 2;
      return (
        <Group
          ref={nodeRef}
          {...commonProps}
          x={shape.x + radius}
          y={shape.y + radius}
          offsetX={radius}
          offsetY={radius}
          onDragStart={onStartEdit}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onTransformStart={onStartEdit}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
        >
          {/* Selection/Lock indicator (outer border) */}
          {isLockOrSelect && (
            <Circle
              x={0}
              y={0}
              radius={radius}
              fill="transparent"
              stroke={overlayStrokeColor}
              strokeWidth={overlayStrokeWidth}
              dash={dash}
              listening={false}
            />
          )}
          {/* Actual shape with its own border */}
          <Circle
            x={0}
            y={0}
            radius={radius}
            fill={shape.fill}
            stroke={shape.stroke || '#e5e7eb'}
            strokeWidth={shape.strokeWidth || 1}
            listening={true}
          />
        </Group>
      );
    }
    case 'line': {
      // For normalized lines, node x/y are top-left of bounding box and points are local
      const localPoints = shape.points || [0, 0, shape.width, shape.height];
      return (
        <Line
          ref={nodeRef}
          {...commonProps}
          width={shape.width || 1}
          height={shape.height || 1}
          points={localPoints}
          stroke={shape.stroke || overlayStrokeColor || '#374151'}
          strokeWidth={shape.strokeWidth || 2}
          // Increase hit area for easier selection (invisible wider line for clicking)
          hitStrokeWidth={Math.max(20, (shape.strokeWidth || 2) * 3)}
          lineCap="round"
          lineJoin="round"
          // Lines should be draggable like other shapes (moves entire line)
          draggable={isSelected && !isLockedByOther && !isPanning}
          onDragStart={onStartEdit}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      );
    }
    case 'text':
      return (
        <Group
          ref={nodeRef}
          {...commonProps}
          offsetX={shape.width / 2}
          offsetY={shape.height / 2}
          x={shape.x + shape.width / 2}
          y={shape.y + shape.height / 2}
          width={shape.width}
          height={shape.height}
          onDragStart={onStartEdit}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onTransformStart={onStartEdit}
          onTransform={handleTransform}
          onTransformEnd={onTransformEnd}
        >
          <Rect
            x={0}
            y={0}
            width={shape.width}
            height={shape.height}
            fill={shape.boxFill ?? 'transparent'}
            stroke={shape.boxStroke ?? 'transparent'}
            strokeWidth={shape.boxStrokeWidth ?? 0}
            listening={false}
          />
          <KonvaText
            x={0}
            y={0}
            width={shape.width}
            height={shape.height}
            text={shape.text || ''}
            fontSize={shape.fontSize || 18}
            fontFamily={shape.fontFamily || 'Inter, system-ui'}
            fontStyle={shape.fontStyle || 'normal'}
            textDecoration={shape.textDecoration || ''}
            fill={shape.fill || '#111827'}
            align={shape.align || 'left'}
            lineHeight={shape.lineHeight ?? 1.2}
            padding={shape.padding ?? 4}
            wrap={shape.wrap ?? 'word'}
            listening={false}
          />
        </Group>
      );
    default:
      return null;
  }
};

export default ShapeNode;


