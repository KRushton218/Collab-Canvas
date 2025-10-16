import { Layer, Line } from 'react-konva';
import { GRID_COLOR, GRID_SIZE } from '../../utils/constants';

/**
 * Infinite grid background similar to Figma
 * Renders a grid that extends infinitely in all directions
 */
const InfiniteGrid = ({ stageWidth, stageHeight, stageX, stageY, scale }) => {
  const gridSize = GRID_SIZE;
  const gridColor = GRID_COLOR;
  const gridStrokeWidth = 1;
  
  // Calculate visible area in canvas coordinates
  const startX = -stageX / scale;
  const startY = -stageY / scale;
  const endX = (stageWidth - stageX) / scale;
  const endY = (stageHeight - stageY) / scale;
  
  // Calculate grid line positions
  const lines = [];
  
  // Vertical lines
  const firstVerticalLine = Math.floor(startX / gridSize) * gridSize;
  for (let x = firstVerticalLine; x <= endX; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, startY - gridSize, x, endY + gridSize]}
        stroke={gridColor}
        strokeWidth={gridStrokeWidth / scale}
        listening={false}
      />
    );
  }
  
  // Horizontal lines
  const firstHorizontalLine = Math.floor(startY / gridSize) * gridSize;
  for (let y = firstHorizontalLine; y <= endY; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[startX - gridSize, y, endX + gridSize, y]}
        stroke={gridColor}
        strokeWidth={gridStrokeWidth / scale}
        listening={false}
      />
    );
  }
  
  return (
    <Layer listening={false}>
      {lines}
    </Layer>
  );
};

export default InfiniteGrid;

