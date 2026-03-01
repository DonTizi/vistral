import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  size?: 'sm' | 'md';
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function Badge({ children, color, className, size = 'md' }: BadgeProps) {
  const style = useMemo(() => {
    if (!color) return undefined;
    const [r, g, b] = hexToRgb(color);
    return { backgroundColor: `rgba(${r},${g},${b},0.12)`, color };
  }, [color]);

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium leading-none',
        size === 'sm' ? 'px-1.5 py-0.5 rounded text-[10px]' : 'px-2 py-0.5 rounded text-[11px]',
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
