import { useEffect, useState } from 'react';

/**
 * Returns true once the page has scrolled past `threshold` pixels.
 * Used to trigger the navbar transparent → solid transition.
 */
export function useScrollPast(threshold = 80) {
  const [past, setPast] = useState(() => window.scrollY > threshold);

  useEffect(() => {
    const check = () => setPast(window.scrollY > threshold);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [threshold]);

  return past;
}
