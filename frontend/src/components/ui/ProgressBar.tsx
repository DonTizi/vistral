interface ProgressBarProps {
  progress: number;
  className?: string;
}

export function ProgressBar({ progress, className }: ProgressBarProps) {
  return (
    <div className={`w-full h-1.5 bg-[#333333] rounded-full overflow-hidden ${className || ''}`}>
      <div
        className="h-full bg-[#FA500F] rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}
