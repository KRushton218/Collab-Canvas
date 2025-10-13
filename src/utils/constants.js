// Canvas dimensions and configuration
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;
export const CANVAS_ID = 'global-canvas-v1';

// Viewport dimensions (visible area)
export const VIEWPORT_WIDTH = window.innerWidth;
export const VIEWPORT_HEIGHT = window.innerHeight;

// Initial canvas position (centered at canvas center)
export const INITIAL_CANVAS_X = CANVAS_WIDTH / 2;
export const INITIAL_CANVAS_Y = CANVAS_HEIGHT / 2;

// Zoom limits
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.1;

// Canvas background color
export const CANVAS_BG_COLOR = '#f5f5f5';
export const CANVAS_BOUNDARY_COLOR = '#e0e0e0';

// Shape defaults and constraints
export const DEFAULT_SHAPE_SIZE = 100;
export const MIN_SHAPE_SIZE = 20;
export const MAX_SHAPE_SIZE = 5000;
