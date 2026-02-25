'use client';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className = '' }: BadgeProps) {
  const style = color
    ? { backgroundColor: `${color}18`, color }
    : {};

  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold px-2.5 py-[3px] rounded tracking-[0.5px] whitespace-nowrap ${
        !color ? 'bg-wimc-surface-alt text-wimc-muted' : ''
      } ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}
