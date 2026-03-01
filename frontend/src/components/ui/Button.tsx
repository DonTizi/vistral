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
        variant === 'primary' && 'bg-[#FA500F] hover:bg-[#E04600] text-white shadow-[0_0_20px_rgba(250,80,15,0.15)] hover:shadow-[0_0_30px_rgba(255,130,5,0.3),0_0_60px_rgba(255,216,0,0.1)]',
        variant === 'secondary' && 'bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#FFFAEB] border border-[#2a2a2a] hover:border-[#FA500F]/30',
        variant === 'ghost' && 'bg-transparent hover:bg-[#1e1e1e] text-[#999999] hover:text-[#FFFAEB]',
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
