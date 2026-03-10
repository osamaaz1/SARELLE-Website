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
      className={`inline-flex items-center text-[12px] font-bold px-3 py-1.5 rounded tracking-[0.5px] whitespace-nowrap ${
        !color ? 'bg-wimc-surface-alt text-wimc-muted' : ''
      } ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}
