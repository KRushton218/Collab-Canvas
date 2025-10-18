import { useRef, useEffect, useMemo } from 'react';
import { Group, Transformer, Rect } from 'react-konva';
import { SelectionGroup } from '../../models/SelectionGroup';

/**
 * SelectionGroupNode - Renders multiple selected shapes as a single draggable/transformable group
 * 
 * This component treats N selected shapes as ONE entity:
 * - Single drag handler
 * - Single transform handler
 * - Batch updates on commit
 * 
 * Performance: O(1) handlers regardless of selection size
 */
const SelectionGroupNode = ({ 
  shapes, 
  onDragStart, 
  onDragMove, 
  onDragEnd,
  onTransformStart,
  onTransformEnd,
  isPanning,
}) => {
  const groupRef = useRef(null);
  const transformerRef = useRef(null);

  // Create SelectionGroup model using useMemo with stable dependency (shape IDs only)
  const shapeIds = useMemo(() => shapes.map(s => s.id).join(','), [shapes]);
  
  const selectionGroup = useMemo(() => {
    try {
      if (shapes.length > 0) {
        return new SelectionGroup(shapes);
      }
      return null;
    } catch (error) {
      console.error('[SelectionGroup] Error creating group:', error);
      return null;
    }
  }, [shapeIds, shapes]);

  // Attach transformer to group
  useEffect(() => {
    if (transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectionGroup]);

  if (!selectionGroup) return null;

  const bounds = selectionGroup.bounds;

  const handleDragStart = (e) => {
    if (isPanning) {
      e.target.stopDrag();
      return;
    }
    
    onDragStart?.({
      groupBounds: bounds,
      shapeIds: selectionGroup.getShapeIds(),
    });
  };

  const handleDragMove = (e) => {
    if (isPanning) return;
    
    const node = e.target;
    const deltaX = node.x();
    const deltaY = node.y();
    
    // Calculate final states for all shapes using simple translation
    const finalStates = selectionGroup.applyTranslation(deltaX, deltaY);
    
    onDragMove?.(finalStates);
  };

  const handleDragEnd = (e) => {
    if (isPanning) return;
    
    const node = e.target;
    const deltaX = node.x();
    const deltaY = node.y();
    
    // Calculate final states for all shapes
    const finalStates = selectionGroup.applyTranslation(deltaX, deltaY);
    
    // Reset group position (shapes have been updated)
    node.position({ x: 0, y: 0 });
    
    onDragEnd?.(finalStates);
  };

  const handleTransformStart = () => {
    if (isPanning) return;
    
    onTransformStart?.({
      groupBounds: bounds,
      shapeIds: selectionGroup.getShapeIds(),
    });
  };

  const handleTransformEnd = (e) => {
    if (isPanning) return;
    
    const node = groupRef.current;
    if (!node) return;
    
    // Get transform values
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    const x = node.x();
    const y = node.y();
    
    // Calculate final states for all shapes using full transform
    const finalStates = selectionGroup.applyTransform({
      x: bounds.x + x,
      y: bounds.y + y,
      width: bounds.width,
      height: bounds.height,
      scaleX,
      scaleY,
      rotation,
    });
    
    // Reset group transform
    node.scaleX(1);
    node.scaleY(1);
    node.rotation(0);
    node.position({ x: 0, y: 0 });
    
    onTransformEnd?.(finalStates);
  };

  return (
    <>
      {/* Invisible Group for drag/transform operations */}
      <Group
        ref={groupRef}
        x={0}
        y={0}
        draggable={!isPanning}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
        listening={true}
      >
        {/* Large invisible rect that covers the group bounds */}
        <Rect
          x={bounds.x}
          y={bounds.y}
          width={Math.max(bounds.width, 10)}
          height={Math.max(bounds.height, 10)}
          fill="rgba(0,0,0,0)"
          stroke="rgba(0,0,0,0)"
        />
      </Group>
      
      {/* Single Transformer for entire group */}
      <Transformer
        ref={transformerRef}
        rotateEnabled={true}
        borderStroke="#3b82f6"
        borderStrokeWidth={2}
        anchorStroke="#3b82f6"
        anchorFill="#fff"
        anchorSize={8}
        anchorCornerRadius={4}
        enabledAnchors={[
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
          'top-center',
          'bottom-center',
          'middle-left',
          'middle-right',
        ]}
      />
    </>
  );
};

export default SelectionGroupNode;

