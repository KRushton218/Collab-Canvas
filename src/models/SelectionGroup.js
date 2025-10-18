/**
 * SelectionGroup - Treats multiple selected shapes as a single entity
 * 
 * Benefits:
 * - Single drag handler (not N handlers)
 * - Single transform calculation
 * - Batch updates only at commit time
 * - Clean separation: UI (group) vs Data (shapes)
 */

export class SelectionGroup {
  constructor(shapes) {
    this.shapes = shapes; // Array of shape objects
    this.shapeIds = shapes.map(s => s.id);
    
    // Calculate bounding box of all shapes
    this.bounds = this.calculateBounds();
    
    // Store initial positions relative to group origin
    this.relativePositions = this.calculateRelativePositions();
  }

  /**
   * Calculate bounding box that contains all shapes
   */
  calculateBounds() {
    if (this.shapes.length === 0) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    const xs = [];
    const ys = [];
    const rights = [];
    const bottoms = [];

    for (const shape of this.shapes) {
      xs.push(shape.x);
      ys.push(shape.y);
      rights.push(shape.x + (shape.width || 0));
      bottoms.push(shape.y + (shape.height || 0));
    }

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...rights);
    const maxY = Math.max(...bottoms);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Calculate each shape's position relative to group origin
   * This allows us to maintain relative positions during transforms
   */
  calculateRelativePositions() {
    const { x: groupX, y: groupY } = this.bounds;
    
    return this.shapes.map(shape => ({
      id: shape.id,
      offsetX: shape.x - groupX,
      offsetY: shape.y - groupY,
      width: shape.width,
      height: shape.height,
      rotation: shape.rotation || 0,
    }));
  }

  /**
   * Apply group transformation to all shapes
   * Returns final states for all shapes
   */
  applyTransform(groupTransform) {
    const { x: newGroupX, y: newGroupY, scaleX = 1, scaleY = 1, rotation = 0 } = groupTransform;
    
    const finalStates = {};
    
    for (const rel of this.relativePositions) {
      // Apply scale to relative position
      const scaledOffsetX = rel.offsetX * scaleX;
      const scaledOffsetY = rel.offsetY * scaleY;
      
      // Calculate new absolute position
      let newX = newGroupX + scaledOffsetX;
      let newY = newGroupY + scaledOffsetY;
      
      // Apply rotation if needed (rotate around group center)
      if (rotation !== 0) {
        const { x: groupCenterX, y: groupCenterY } = this.getGroupCenter(groupTransform);
        const rotated = this.rotatePoint(newX, newY, groupCenterX, groupCenterY, rotation);
        newX = rotated.x;
        newY = rotated.y;
      }
      
      finalStates[rel.id] = {
        x: newX,
        y: newY,
        width: rel.width * scaleX,
        height: rel.height * scaleY,
        rotation: (rel.rotation + rotation) % 360,
      };
    }
    
    return finalStates;
  }

  /**
   * Get the center point of the group
   */
  getGroupCenter(groupTransform = this.bounds) {
    return {
      x: groupTransform.x + groupTransform.width / 2,
      y: groupTransform.y + groupTransform.height / 2,
    };
  }

  /**
   * Rotate a point around a center point
   */
  rotatePoint(x, y, centerX, centerY, degrees) {
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    const dx = x - centerX;
    const dy = y - centerY;
    
    return {
      x: centerX + (dx * cos - dy * sin),
      y: centerY + (dx * sin + dy * cos),
    };
  }

  /**
   * Apply simple translation (drag) to all shapes
   * This is optimized for the common case of just moving shapes
   */
  applyTranslation(deltaX, deltaY) {
    const finalStates = {};
    
    for (const shape of this.shapes) {
      finalStates[shape.id] = {
        x: shape.x + deltaX,
        y: shape.y + deltaY,
        width: shape.width,
        height: shape.height,
        rotation: shape.rotation || 0,
      };
    }
    
    return finalStates;
  }

  /**
   * Get all shape IDs in this group
   */
  getShapeIds() {
    return this.shapeIds;
  }

  /**
   * Get the number of shapes in this group
   */
  size() {
    return this.shapes.length;
  }
}


