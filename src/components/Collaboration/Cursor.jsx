/**
 * Cursor Component - Displays other users' cursors on the canvas
 * Shows cursor icon with user name label using Konva shapes
 * Cursor size is constant in screen space (doesn't scale with canvas zoom)
 */

import React from 'react';
import { Group, Path, Text, Rect } from 'react-konva';

export const Cursor = ({ x, y, color, displayName, scale = 1 }) => {
  const labelPadding = 6;
  const labelText = displayName || 'User';
  const fontSize = 12;
  
  // Estimate label width (rough approximation)
  const labelWidth = labelText.length * 7 + labelPadding * 2;
  const labelHeight = fontSize + labelPadding;
  
  // Inverse scale to keep cursor constant size regardless of canvas zoom
  // Clamp between reasonable bounds (0.5x to 3x)
  const inverseScale = Math.max(0.33, Math.min(3, 1 / scale));

  return (
    <Group x={x} y={y} scaleX={inverseScale} scaleY={inverseScale}>
      {/* Cursor arrow shape */}
      <Path
        data="M 0 0 L 0 16 L 4 12 L 7 18 L 9 17 L 6 11 L 11 11 Z"
        fill={color}
        stroke="white"
        strokeWidth={1}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.3}
        shadowOffsetX={1}
        shadowOffsetY={1}
      />

      {/* Name label background */}
      <Rect
        x={18}
        y={2}
        width={labelWidth}
        height={labelHeight}
        fill={color}
        cornerRadius={4}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.2}
        shadowOffsetX={1}
        shadowOffsetY={1}
      />

      {/* Name label text */}
      <Text
        x={18 + labelPadding}
        y={2 + labelPadding / 2}
        text={labelText}
        fontSize={fontSize}
        fontFamily="Arial, sans-serif"
        fontStyle="500"
        fill="white"
      />
    </Group>
  );
};

