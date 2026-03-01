'use client';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export function ProgressBar({ progress, className }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden relative ${className || ''}`}>
      <motion.div
        className="h-full rounded-full relative"
        animate={{ width: `${clampedProgress}%` }}
        transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 0.8 }}
        style={{
          background: 'linear-gradient(90deg, #FFD800, #FFAF00, #FF8205, #FA500F, #E10500)',
        }}
      >
        {/* Leading glow effect */}
        {clampedProgress > 0 && clampedProgress < 100 && (
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-6 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at right center, rgba(250, 80, 15, 0.6) 0%, transparent 70%)',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
