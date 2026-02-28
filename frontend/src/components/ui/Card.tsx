import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[#242424] border border-[#333333] rounded-xl p-4',
        onClick && 'cursor-pointer hover:border-[#FA500F] transition-colors duration-200',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
