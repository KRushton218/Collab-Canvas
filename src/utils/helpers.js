/**
 * Generate a unique ID for shapes
 * @returns {string} Unique identifier
 */
export const generateShapeId = () => {
  return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate if a shape position is within canvas boundaries
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {boolean} True if within boundaries
 */
export const isWithinBounds = (x, y, width, height, canvasWidth, canvasHeight) => {
  return x >= 0 && y >= 0 && x + width <= canvasWidth && y + height <= canvasHeight;
};

/**
 * Constrain a shape position to canvas boundaries
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {object} Constrained position {x, y}
 */
export const constrainToBounds = (x, y, width, height, canvasWidth, canvasHeight) => {
  return {
    x: Math.max(0, Math.min(x, canvasWidth - width)),
    y: Math.max(0, Math.min(y, canvasHeight - height)),
  };
};

/**
 * User color palette for cursors and presence
 * Expanded palette with more variety for better user distinction
 */
export const CURSOR_COLORS = [
  // Primary colors
  { hex: '#FF6B6B', name: 'Coral Red' },
  { hex: '#4ECDC4', name: 'Teal' },
  { hex: '#45B7D1', name: 'Sky Blue' },
  { hex: '#FFA07A', name: 'Light Salmon' },
  { hex: '#98D8C8', name: 'Mint' },
  { hex: '#F7DC6F', name: 'Yellow' },
  { hex: '#BB8FCE', name: 'Purple' },
  { hex: '#85C1E2', name: 'Light Blue' },
  { hex: '#F8B739', name: 'Orange' },
  { hex: '#52C41A', name: 'Green' },
  // Extended palette
  { hex: '#E74C3C', name: 'Red' },
  { hex: '#9B59B6', name: 'Amethyst' },
  { hex: '#3498DB', name: 'Blue' },
  { hex: '#1ABC9C', name: 'Turquoise' },
  { hex: '#2ECC71', name: 'Emerald' },
  { hex: '#F39C12', name: 'Sunflower' },
  { hex: '#E91E63', name: 'Pink' },
  { hex: '#00BCD4', name: 'Cyan' },
  { hex: '#FF5722', name: 'Deep Orange' },
  { hex: '#607D8B', name: 'Blue Grey' },
];

// Legacy array for backwards compatibility
const USER_COLORS = CURSOR_COLORS.map(c => c.hex);

/**
 * Local storage key for cursor color preference
 */
const CURSOR_COLOR_STORAGE_KEY = 'collab-canvas-cursor-color';

/**
 * Get saved cursor color from localStorage
 * @param {string} userId - User identifier (for fallback generation)
 * @returns {string} Hex color code
 */
export const getSavedCursorColor = (userId) => {
  try {
    const savedColor = localStorage.getItem(CURSOR_COLOR_STORAGE_KEY);
    if (savedColor && CURSOR_COLORS.some(c => c.hex === savedColor)) {
      return savedColor;
    }
  } catch (e) {
    // localStorage not available
  }
  // Fallback to generated color
  return generateUserColor(userId);
};

/**
 * Save cursor color preference to localStorage
 * @param {string} color - Hex color code
 */
export const saveCursorColor = (color) => {
  try {
    localStorage.setItem(CURSOR_COLOR_STORAGE_KEY, color);
  } catch (e) {
    // localStorage not available
  }
};

/**
 * Generate a consistent color for a user based on their ID
 * @param {string} userId - User identifier
 * @returns {string} Hex color code
 */
export const generateUserColor = (userId) => {
  if (!userId) return USER_COLORS[0];

  // Generate a hash from the userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use the hash to pick a color
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
};

