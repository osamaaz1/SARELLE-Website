'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/marketplace/product-card';
import { FilterPanel } from '@/components/marketplace/filter-panel';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export default function BrowsePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'All',
    brand: searchParams.get('brand') || '',
    condition: searchParams.get('condition') || '',
    sort: searchParams.get('sort') || 'newest',
  });
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (filters.category !== 'All') params.category = filters.category;
      if (filters.brand) params.brand = filters.brand;
      if (filters.condition) params.condition = filters.condition;
      if (filters.sort) params.sort = filters.sort;

      const res = await api.browseListings(params);
      setListings(res.listings || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, [page, filters, search]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 animate-fade-in">
      <h1 className="font-heading text-[28px] font-bold mb-5">Shop</h1>

      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-wimc-surface rounded-[10px] border border-wimc-border px-3.5 py-2.5 max-w-[360px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-[13px] text-white flex-1 placeholder:text-[#555]"
          />
        </div>

        <FilterPanel filters={filters} onChange={handleFilterChange} />

        <p className="text-[12px] text-[#555]">{total} items</p>

        {loading ? (
          <LoadingSpinner />
        ) : listings.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {listings.map((item: any) => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  brand={item.brand}
                  price={item.price}
                  photos={item.photos || []}
                  condition={item.condition}
                  category={item.category}
                  originalPrice={item.original_price}
                  bidding={item.bidding}
                  bids={item.bids}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <span className="text-sm text-wimc-muted px-4">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState title="No items found" description="Try adjusting your filters or search query" />
        )}
      </div>
    </div>
  );
}
