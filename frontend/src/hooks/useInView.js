import { useRef, useState, useEffect } from 'react';

/**
 * Returns [ref, isInView] — fires once when the element enters the viewport.
 * Uses IntersectionObserver with unobserve-after-trigger pattern.
 */
export function useInView(options = {}) {
  const ref      = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.2, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return [ref, isInView];
}
