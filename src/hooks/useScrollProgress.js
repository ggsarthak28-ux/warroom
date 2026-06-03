import { useEffect, useRef } from "react";

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function getScrollSnapshot() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      scrollY: 0,
      scrollProgress: 0,
    };
  }

  const scrollY = window.scrollY || window.pageYOffset || 0;
  const documentHeight = Math.max(
    document.body?.scrollHeight || 0,
    document.documentElement?.scrollHeight || 0
  );
  const maxScroll = Math.max(documentHeight - window.innerHeight, 0);

  return {
    scrollY,
    scrollProgress: maxScroll > 0 ? clamp01(scrollY / maxScroll) : 0,
  };
}

export default function useScrollProgress() {
  const scrollRef = useRef(getScrollSnapshot());
  const frameRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateScrollRef = () => {
      frameRef.current = null;
      scrollRef.current = getScrollSnapshot();
    };

    const requestScrollUpdate = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(updateScrollRef);
    };

    updateScrollRef();

    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestScrollUpdate);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return scrollRef;
}
