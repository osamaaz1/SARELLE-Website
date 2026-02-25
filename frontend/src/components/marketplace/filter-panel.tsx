'use client';

const CATEGORIES = ['All', 'Bags', 'Shoes', 'Clothing', 'Watches', 'Jewellery'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'oldest', label: 'Oldest' },
];

interface FilterPanelProps {
  filters: { category: string; brand: string; condition: string; sort: string };
  onChange: (key: string, value: string) => void;
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  return (
    <div className="space-y-3">
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const active = filters.category === cat;
          return (
            <button
              key={cat}
              onClick={() => onChange('category', cat)}
              className={`rounded-full px-4 py-[7px] text-[11px] font-semibold transition-all duration-150 ${
                active
                  ? 'bg-white border-2 border-white text-black'
                  : 'bg-wimc-surface border border-wimc-border text-wimc-muted hover:border-[#444]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
      {/* Sort */}
      <div className="flex items-center gap-2">
        <select
          value={filters.sort}
          onChange={(e) => onChange('sort', e.target.value)}
          className="bg-wimc-surface border border-wimc-border rounded-[10px] px-3 py-[7px] text-[11px] font-semibold text-wimc-muted outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
