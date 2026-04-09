import { useEffect } from "react";

let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

function getScrollbarWidth(): number {
  if (typeof document === "undefined") return 0;
  return window.innerWidth - document.documentElement.clientWidth;
}

/**
 * Impede scroll do documento enquanto `locked` é true.
 * Suporta vários overlays em simultâneo (contador interno).
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      savedPaddingRight = document.body.style.paddingRight;
      const gap = getScrollbarWidth();
      document.body.style.overflow = "hidden";
      if (gap > 0) {
        document.body.style.paddingRight = `${gap}px`;
      }
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
        document.body.style.paddingRight = savedPaddingRight;
      }
    };
  }, [locked]);
}
