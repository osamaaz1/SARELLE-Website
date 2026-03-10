'use client';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost' | 'success' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-bold rounded-[10px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-white text-black hover:bg-white/90',
      accent: 'bg-wimc-red hover:bg-wimc-red/80 text-white',
      outline: 'border-[1.5px] border-[#444] hover:border-wimc-muted text-white bg-transparent hover:bg-wimc-surface',
      danger: 'bg-wimc-red text-white hover:bg-wimc-red/80',
      ghost: 'hover:bg-wimc-surface text-wimc-muted hover:text-white',
      success: 'bg-wimc-green/20 hover:bg-wimc-green/30 text-wimc-green border border-wimc-green/30',
    };

    const sizes = {
      sm: 'px-4 py-2.5 text-[13px] min-h-[44px]',
      md: 'px-7 py-3.5 text-[15px] min-h-[48px]',
      lg: 'px-8 py-4 text-[16px] min-h-[52px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
export { Button };
