import { useCountUp } from '@/hooks/useCountUp';

interface CountUpProps {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  decimals?: number;
}

export function CountUp({ to, duration = 600, suffix = '', prefix = '', className = '', decimals = 0 }: CountUpProps) {
  const value = useCountUp(to, { duration });
  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
