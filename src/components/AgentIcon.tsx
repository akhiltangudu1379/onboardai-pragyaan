import { Compass } from 'lucide-react';

interface AgentIconProps {
  size?: number;
  state?: 'idle' | 'processing' | 'ready';
  className?: string;
}

export function AgentIcon({ size = 40, state = 'idle', className = '' }: AgentIconProps) {
  if (state === 'processing') {
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 rounded-full bg-primary-100 animate-pulse-glow" />
        <div className="absolute inset-2 rounded-full border-2 border-primary-300/40 border-t-primary-500 animate-spin-slow" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-b-accent-400/40 animate-spin-reverse"
        />
        <div className="absolute rounded-full bg-primary-500 animate-spark" style={{ width: 4, height: 4, top: 2, right: 6 }} />
        <div className="relative text-primary-600">
          <Compass size={size * 0.4} />
        </div>
      </div>
    );
  }

  if (state === 'ready') {
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 rounded-full bg-success-100 animate-success-pulse" />
        <div className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/20"
          style={{ width: size * 0.7, height: size * 0.7 }}
        >
          <Compass size={size * 0.35} />
        </div>
      </div>
    );
  }

  // idle
  return (
    <div
      className={`relative flex items-center justify-center animate-float ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-100 to-accent-100" />
      <div className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/20"
        style={{ width: size * 0.7, height: size * 0.7 }}
      >
        <Compass size={size * 0.35} />
      </div>
    </div>
  );
}
