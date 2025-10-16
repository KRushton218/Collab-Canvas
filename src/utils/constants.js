// Canvas configuration
export const CANVAS_ID = 'global-canvas-v1';

// Viewport dimensions (visible area)
export const VIEWPORT_WIDTH = window.innerWidth;
export const VIEWPORT_HEIGHT = window.innerHeight;

// Initial canvas position (origin point for "recenter" action)
// Canvas is now infinite, these just set a comfortable starting point
export const INITIAL_CANVAS_X = 2500;
export const INITIAL_CANVAS_Y = 2500;

// Zoom limits
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.1;

// Grid colors (infinite canvas)
export const GRID_COLOR = '#e0e0e0';
export const GRID_SIZE = 50;

// Shape defaults and constraints
export const DEFAULT_SHAPE_SIZE = 100;
export const MIN_SHAPE_SIZE = 20;
export const MAX_SHAPE_SIZE = 5000;
