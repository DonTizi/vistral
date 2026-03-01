import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({ children, color, className, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium leading-none',
        size === 'sm' ? 'px-1.5 py-0.5 rounded text-[10px]' : 'px-2 py-0.5 rounded text-[11px]',
        className
      )}
      style={color ? { backgroundColor: `${color}18`, color, border: `1px solid ${color}30` } : undefined}
    >
      {children}
    </span>
  );
}
