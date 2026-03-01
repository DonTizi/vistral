import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'dark' | 'light';
  onClick?: () => void;
}

export function Card({ children, className, variant = 'dark', onClick }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md px-3 py-2.5',
        variant === 'dark' && 'bg-[#1E1E1E] border border-[#2a2a2a]',
        variant === 'light' && 'bg-[#FFFAEB] text-[#1A1A1A] border border-[#E9E2CB]',
        onClick && variant === 'dark' && 'cursor-pointer hover:bg-[#252525] hover:border-[#3a3a3a] transition-colors duration-150',
        onClick && variant === 'light' && 'cursor-pointer hover:border-[#FA500F] transition-colors duration-150',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
