import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  duration?: number;
  start?: number;
}

export function useCountUp(target: number, { duration = 600, start = 0 }: UseCountUpOptions = {}) {
  const [value, setValue] = useState(start);
  const rafRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const fromRef = useRef(start);

  useEffect(() => {
    fromRef.current = value;
    startTimeRef.current = 0;

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (target - fromRef.current) * eased;
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
