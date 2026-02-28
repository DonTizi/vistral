'use client';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'font-medium rounded-lg transition-all duration-200 cursor-pointer',
        variant === 'primary' && 'bg-[#FA500F] hover:bg-[#E04600] text-white',
        variant === 'secondary' && 'bg-[#242424] hover:bg-[#333333] text-[#FFFAEB] border border-[#333333]',
        variant === 'ghost' && 'bg-transparent hover:bg-[#242424] text-[#999999] hover:text-[#FFFAEB]',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
