import { useRef, useCallback } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipeRef<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeOptions): (node: T | null) => void {
  const startX = useRef(0);
  const startY = useRef(0);
  const prevNode = useRef<T | null>(null);
  const handlersRef = useRef({ onSwipeLeft, onSwipeRight });
  handlersRef.current = { onSwipeLeft, onSwipeRight };

  const touchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const touchEnd = useCallback(
    (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - startX.current;
      const deltaY = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY)) return;
      if (deltaX < 0) {
        handlersRef.current.onSwipeLeft?.();
      } else {
        handlersRef.current.onSwipeRight?.();
      }
    },
    [threshold],
  );

  return useCallback(
    (node: T | null) => {
      if (prevNode.current) {
        prevNode.current.removeEventListener('touchstart', touchStart);
        prevNode.current.removeEventListener('touchend', touchEnd);
      }
      prevNode.current = node;
      if (node) {
        node.addEventListener('touchstart', touchStart, { passive: true });
        node.addEventListener('touchend', touchEnd, { passive: true });
      }
    },
    [touchStart, touchEnd],
  );
}
