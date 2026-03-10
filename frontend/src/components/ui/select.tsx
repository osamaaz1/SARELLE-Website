'use client';
import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className="text-sm text-wimc-muted">{label}</label>}
        <select
          ref={ref}
          className={`w-full bg-wimc-surface border border-wimc-border rounded-lg px-4 py-3.5 text-[16px] text-white focus:outline-none focus:border-wimc-border-alt transition-colors appearance-none ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  },
);
Select.displayName = 'Select';
export { Select };
