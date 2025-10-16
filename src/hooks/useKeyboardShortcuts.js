import { useEffect } from 'react';

/**
 * Centralized keyboard shortcuts handler
 * Prevents conflicts and provides consistent UX
 */
export const useKeyboardShortcuts = ({
  // Selection
  selectedIds,
  deselectAll,
  selectAll,
  
  // Tools
  setActiveTool,
  
  // Edit actions
  undo,
  redo,
  canUndo,
  canRedo,
  
  // Clipboard
  copySelected,
  pasteFromClipboard,
  duplicateSelected,
  
  // Delete
  deleteShape,
  
  // Layers
  bringToFront,
  sendToBack,
  
  // Movement
  moveSelectedShapes,
  
  // State
  isEditingText,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input/textarea
      const isInput = e.target.tagName === 'INPUT' || 
                      e.target.tagName === 'TEXTAREA' || 
                      e.target.isContentEditable;
      
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      // TOOL SHORTCUTS (no modifier)
      if (!isInput && !isMod) {
        if (key === 'v') {
          e.preventDefault();
          setActiveTool?.('select');
          return;
        }
        if (key === 'r') {
          e.preventDefault();
          setActiveTool?.('rectangle');
          return;
        }
        if (key === 'c') {
          e.preventDefault();
          setActiveTool?.('circle');
          return;
        }
        if (key === 'l') {
          e.preventDefault();
          setActiveTool?.('line');
          return;
        }
        if (key === 't') {
          e.preventDefault();
          setActiveTool?.('text');
          return;
        }
      }

      // UNDO/REDO (Cmd+Z, Cmd+Shift+Z)
      if (!isInput && isMod && key === 'z') {
        e.preventDefault();
        if (isShift) {
          redo?.();
        } else {
          undo?.();
        }
        return;
      }

      // COPY (Cmd+C)
      if (!isInput && isMod && key === 'c' && selectedIds?.size > 0) {
        e.preventDefault();
        copySelected?.();
        return;
      }

      // PASTE (Cmd+V)
      if (!isInput && isMod && key === 'v') {
        e.preventDefault();
        pasteFromClipboard?.();
        return;
      }

      // DUPLICATE (Cmd+D)
      if (!isInput && isMod && key === 'd' && selectedIds?.size > 0) {
        e.preventDefault();
        duplicateSelected?.();
        return;
      }

      // SELECT ALL (Cmd+A)
      if (!isInput && isMod && key === 'a') {
        e.preventDefault();
        selectAll?.();
        return;
      }

      // DELETE (Delete or Backspace)
      if (!isInput && !isEditingText && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedIds?.size > 0) {
          e.preventDefault();
          const idsToDelete = Array.from(selectedIds);
          deselectAll?.();
          idsToDelete.forEach(id => deleteShape?.(id));
        }
        return;
      }

      // BRING TO FRONT (Cmd+])
      if (!isInput && isMod && e.key === ']' && selectedIds?.size > 0) {
        e.preventDefault();
        bringToFront?.();
        return;
      }

      // SEND TO BACK (Cmd+[)
      if (!isInput && isMod && e.key === '[' && selectedIds?.size > 0) {
        e.preventDefault();
        sendToBack?.();
        return;
      }

      // ARROW KEYS - Move selected shapes
      if (!isInput && !isMod && selectedIds?.size > 0) {
        const moveAmount = isShift ? 10 : 1; // Shift = larger movement
        
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          moveSelectedShapes?.(-moveAmount, 0);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          moveSelectedShapes?.(moveAmount, 0);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveSelectedShapes?.(0, -moveAmount);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveSelectedShapes?.(0, moveAmount);
          return;
        }
      }

      // ESCAPE - Deselect or return to select tool
      if (!isInput && e.key === 'Escape') {
        e.preventDefault();
        if (selectedIds?.size > 0) {
          deselectAll?.();
        } else {
          setActiveTool?.('select');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedIds,
    deselectAll,
    selectAll,
    setActiveTool,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelected,
    pasteFromClipboard,
    duplicateSelected,
    deleteShape,
    bringToFront,
    sendToBack,
    moveSelectedShapes,
    isEditingText,
  ]);
};

