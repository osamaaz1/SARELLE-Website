'use client';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className="text-sm text-wimc-muted">{label}</label>}
        <input
          ref={ref}
          className={`w-full bg-wimc-surface border border-wimc-border rounded-lg px-4 py-3.5 text-[16px] leading-normal text-white placeholder:text-wimc-subtle focus:outline-none focus:border-wimc-border-alt transition-colors ${
            error ? 'border-wimc-red' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-wimc-red">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
export { Input };
