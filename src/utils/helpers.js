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
 */
const USER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Orange
  '#52C41A', // Green
];

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

