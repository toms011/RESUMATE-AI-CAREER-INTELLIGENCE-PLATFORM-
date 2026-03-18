/**
 * useOverflowDetection — Custom hook to detect when resume content
 * overflows the A4 page and auto-adjust font scale to fit.
 *
 * Monitors #editor-resume-paper height vs A4 height (297mm).
 * If overflow detected, gradually reduces fontScale.
 */
import { useEffect, useRef, useCallback } from 'react';
import { mmToPx } from '../../utils/resumeStyles';

const A4_HEIGHT_PX = mmToPx(297);

/**
 * @param {Object} options
 * @param {number} options.currentFontScale - Current font scale value
 * @param {function} options.setFontScale - Setter for font scale
 * @param {boolean} options.autoFit - Whether auto-fit is enabled
 * @param {number} options.minScale - Minimum allowed scale (default 0.7)
 */
export function useOverflowDetection({
  currentFontScale,
  setFontScale,
  autoFit = false,
  minScale = 0.7,
}) {
  const checkTimeoutRef = useRef(null);
  const isAdjustingRef = useRef(false);

  const checkOverflow = useCallback(() => {
    if (!autoFit || isAdjustingRef.current) return;

    const paper = document.getElementById('editor-resume-paper');
    if (!paper) return;

    const contentHeight = paper.scrollHeight;
    const pageHeight = A4_HEIGHT_PX;

    if (contentHeight > pageHeight && currentFontScale > minScale) {
      isAdjustingRef.current = true;
      // Reduce by 2% increments
      const newScale = Math.max(minScale, currentFontScale - 0.02);
      setFontScale(newScale);

      // Check again after DOM updates
      setTimeout(() => {
        isAdjustingRef.current = false;
      }, 100);
    }
  }, [autoFit, currentFontScale, setFontScale, minScale]);

  useEffect(() => {
    if (!autoFit) return;

    // Debounced check after any render
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(checkOverflow, 300);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [autoFit, checkOverflow, currentFontScale]);

  // Also observe DOM mutations for content changes
  useEffect(() => {
    if (!autoFit) return;

    const paper = document.getElementById('editor-resume-paper');
    if (!paper) return;

    const observer = new MutationObserver(() => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = setTimeout(checkOverflow, 500);
    });

    observer.observe(paper, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [autoFit, checkOverflow]);

  return {
    isOverflowing: (() => {
      const paper = document.getElementById('editor-resume-paper');
      return paper ? paper.scrollHeight > A4_HEIGHT_PX : false;
    })(),
  };
}

export default useOverflowDetection;
