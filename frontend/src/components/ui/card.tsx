'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-wimc-surface border border-wimc-border rounded-xl ${
        hover ? 'hover:border-wimc-border-alt hover:shadow-lg transition-all cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
