// Base and derived classes for canvas objects. These classes are used to
// construct canonical shape records that can be persisted via the shapes
// service. They do not perform rendering; rendering is handled by Konva
// components.

export class CanvasObject {
  constructor({ id = null, type, x = 0, y = 0, width = 0, height = 0, fill = '#cccccc', rotation = 0, stroke = null, strokeWidth = 0 }) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fill = fill;
    this.rotation = rotation;
    this.stroke = stroke;
    this.strokeWidth = strokeWidth;
  }

  toRecord(createdBy = null) {
    return {
      // id is assigned by the service if not present
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      fill: this.fill,
      rotation: this.rotation,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      createdBy,
    };
  }
}

export class RectangleObject extends CanvasObject {
  constructor({ id = null, x = 0, y = 0, width = 100, height = 100, fill = '#cccccc', rotation = 0, stroke = null, strokeWidth = 0, cornerRadius = 0 }) {
    super({ id, type: 'rectangle', x, y, width, height, fill, rotation, stroke, strokeWidth });
    this.cornerRadius = cornerRadius;
  }

  toRecord(createdBy = null) {
    return {
      ...super.toRecord(createdBy),
      cornerRadius: this.cornerRadius,
    };
  }
}

export class CircleObject extends CanvasObject {
  // We model circles as width/height of the bounding box for easier transforms
  constructor({ id = null, x = 0, y = 0, width = 100, height = 100, fill = '#cccccc', rotation = 0, stroke = null, strokeWidth = 0 }) {
    super({ id, type: 'circle', x, y, width, height, fill, rotation, stroke, strokeWidth });
  }
}

export class LineObject extends CanvasObject {
  constructor({ id = null, points = [0, 0, 100, 100], fill = 'transparent', stroke = '#374151', strokeWidth = 2 }) {
    // For lines we keep x/y for compatibility but rendering uses points
    const minX = Math.min(points[0], points[2]);
    const minY = Math.min(points[1], points[3]);
    super({ id, type: 'line', x: minX, y: minY, width: 0, height: 0, fill, rotation: 0, stroke, strokeWidth });
    this.points = points;
  }

  toRecord(createdBy = null) {
    return {
      ...super.toRecord(createdBy),
      points: this.points,
    };
  }
}

export class TextObject extends CanvasObject {
  constructor({ id = null, x = 0, y = 0, width = 160, height = 40, fill = '#111827', text = 'Text', fontSize = 18, fontFamily = 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif', align = 'left', fontStyle = 'normal', textDecoration = '' }) {
    super({ id, type: 'text', x, y, width, height, fill });
    this.text = text;
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this.align = align;
    this.fontStyle = fontStyle; // 'normal', 'bold', 'italic', 'bold italic'
    this.textDecoration = textDecoration; // '', 'underline', 'line-through'
  }

  toRecord(createdBy = null) {
    return {
      ...super.toRecord(createdBy),
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      align: this.align,
      fontStyle: this.fontStyle,
      textDecoration: this.textDecoration,
    };
  }
}

export class GroupObject extends CanvasObject {
  constructor({ id = null, children = [] }) {
    super({ id, type: 'group', x: 0, y: 0, width: 0, height: 0, fill: 'transparent' });
    this.children = children; // array of CanvasObject
  }

  toRecord(createdBy = null) {
    // Groups can be expanded into children records; for now we serialize minimally
    return {
      ...super.toRecord(createdBy),
      children: this.children.map((child) => (typeof child.toRecord === 'function' ? child.toRecord(createdBy) : child)),
    };
  }
}

export const CanvasObjectFactory = {
  fromShape(shape) {
    switch (shape.type) {
      case 'rectangle':
        return new RectangleObject(shape);
      case 'circle':
        return new CircleObject(shape);
      case 'line':
        return new LineObject(shape);
      case 'text':
        return new TextObject(shape);
      case 'group':
        return new GroupObject(shape);
      default:
        return new CanvasObject({ ...shape, type: shape.type || 'rectangle' });
    }
  },
};


