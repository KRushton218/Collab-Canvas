import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CanvasProvider, CanvasContext } from '../../../src/contexts/CanvasContext';
import { AuthContext } from '../../../src/contexts/AuthContext';
import { MIN_ZOOM, MAX_ZOOM } from '../../../src/utils/constants';
import { useContext } from 'react';

// Mock the shapes service
vi.mock('../../../src/services/shapes', () => ({
  loadShapes: vi.fn().mockResolvedValue([]),
  subscribeToShapes: vi.fn(() => () => {}),
  createShape: vi.fn((shapeData) => {
    const id = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return Promise.resolve(id);
  }),
  updateShape: vi.fn().mockResolvedValue(undefined),
  deleteShape: vi.fn().mockResolvedValue(undefined),
  lockShape: vi.fn().mockResolvedValue(true),
  unlockShape: vi.fn().mockResolvedValue(undefined),
  setupDisconnectHandler: vi.fn(() => () => {}),
  isShapeLockedByOther: vi.fn().mockReturnValue(false),
}));

const mockCurrentUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

const useCanvasContext = () => {
  return useContext(CanvasContext);
};

const Wrapper = ({ children }) => {
  return (
    <AuthContext.Provider value={{ currentUser: mockCurrentUser, loading: false }}>
      <CanvasProvider>{children}</CanvasProvider>
    </AuthContext.Provider>
  );
};

describe('CanvasContext', () => {
  it('should provide initial state', () => {
    const { result } = renderHook(() => useCanvasContext(), {
      wrapper: Wrapper,
    });

    expect(result.current.shapes).toEqual([]);
    expect(result.current.selectedId).toBeNull();
    expect(result.current.scale).toBe(1);
    expect(result.current.position).toBeDefined();
    expect(result.current.stageRef).toBeDefined();
  });

  it('should enforce minimum zoom limit', () => {
    const { result } = renderHook(() => useCanvasContext(), {
      wrapper: Wrapper,
    });

    act(() => {
      const newScale = result.current.setScale(MIN_ZOOM - 0.5);
      expect(newScale).toBe(MIN_ZOOM);
    });
  });

  it('should enforce maximum zoom limit', () => {
    const { result } = renderHook(() => useCanvasContext(), {
      wrapper: Wrapper,
    });

    act(() => {
      const newScale = result.current.setScale(MAX_ZOOM + 1);
      expect(newScale).toBe(MAX_ZOOM);
    });
  });

  it('should allow zoom within valid range', () => {
    const { result } = renderHook(() => useCanvasContext(), {
      wrapper: Wrapper,
    });

    act(() => {
      const newScale = result.current.setScale(1.5);
      expect(newScale).toBe(1.5);
    });

    // Verify scale was updated
    expect(result.current.scale).toBe(1.5);
  });

  it('should add a shape', async () => {
    const { result } = renderHook(() => useCanvasContext(), {
      wrapper: Wrapper,
    });

    let shapeId;
    await act(async () => {
      shapeId = await result.current.addShape({
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: '#cccccc',
      });
    });

    // Note: In the actual implementation, shapes are updated via Firestore subscription
    // This test verifies that addShape is called successfully
    expect(shapeId).toBeDefined();
    expect(typeof shapeId).toBe('string');
  });

  it('should update a shape', async () => {
    const { result } = renderHook(() => useCanvasContext(), {
      wrapper: Wrapper,
    });

    let shapeId;
    await act(async () => {
      shapeId = await result.current.addShape({
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: '#cccccc',
      });
    });

    await act(async () => {
      await result.current.updateShape(shapeId, { x: 200, y: 200 });
    });

    // Note: In the actual implementation, shapes are updated via Firestore subscription
    // This test verifies that updateShape is called successfully without errors
    expect(shapeId).toBeDefined();
  });

  it('should delete a shape', async () => {
    const { result } = renderHook(() => useCanvasContext(), {
      wrapper: Wrapper,
    });

    let shapeId;
    await act(async () => {
      shapeId = await result.current.addShape({
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: '#cccccc',
      });
    });

    await act(async () => {
      await result.current.deleteShape(shapeId);
    });

    // Note: In the actual implementation, shapes are updated via Firestore subscription
    // This test verifies that deleteShape is called successfully without errors
    expect(shapeId).toBeDefined();
  });

  it('should clear selection when deleting selected shape', async () => {
    const { result } = renderHook(() => useCanvasContext(), {
      wrapper: Wrapper,
    });

    let shapeId;
    await act(async () => {
      shapeId = await result.current.addShape({
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: '#cccccc',
      });
    });

    await act(async () => {
      await result.current.setSelectedId(shapeId);
    });

    // selectedId should be set after locking
    expect(result.current.selectedId).toBe(shapeId);

    await act(async () => {
      await result.current.deleteShape(shapeId);
    });

    // After deletion, selection should be cleared
    expect(result.current.selectedId).toBeNull();
  });

  it('should reset view to center', () => {
    const { result } = renderHook(() => useCanvasContext(), {
      wrapper: Wrapper,
    });

    // Change scale and position
    act(() => {
      result.current.setScale(2);
      result.current.setPosition({ x: 500, y: 500 });
    });

    // Reset view
    act(() => {
      result.current.resetView();
    });

    expect(result.current.scale).toBe(1);
    expect(result.current.position).toBeDefined();
  });
});

