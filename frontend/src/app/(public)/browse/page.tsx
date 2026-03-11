'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import { ProductCard } from '@/components/marketplace/product-card';

const FilterPanel = dynamic(() => import('@/components/marketplace/filter-panel').then(m => ({ default: m.FilterPanel })));
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';

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
  const [auctionMap, setAuctionMap] = useState<Record<string, any>>({});
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
      const items = res.listings || [];
      setListings(items);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);

      // Fetch auction data for auction-type listings
      const auctionItems = items.filter((l: any) => l.celebrity_id || l.bidding || l.listing_type === 'auction');
      if (auctionItems.length > 0) {
        const auctions = await Promise.all(
          auctionItems.map((l: any) => api.getAuction(l.id).catch(() => null))
        );
        const map: Record<string, any> = {};
        auctionItems.forEach((l: any, i: number) => {
          if (auctions[i]) map[l.id] = auctions[i];
        });
        setAuctionMap(map);
      }
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
    <PullToRefresh onRefresh={fetchListings}>
    <div className="max-w-[1200px] mx-auto px-6 py-8 animate-fade-in">
      <h1 className="font-heading text-[28px] font-bold mb-5">Shop</h1>

      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3 bg-wimc-surface rounded-[12px] border border-wimc-border px-4 py-3 sm:max-w-[400px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search brands, items..."
            className="bg-transparent border-none outline-none text-[16px] leading-normal text-white flex-1 placeholder:text-[#555] min-h-[28px]"
          />
        </div>

        <FilterPanel filters={filters} onChange={handleFilterChange} />

        <p className="text-[13px] text-[#555]">{total} items</p>

        {loading ? (
          <LoadingSpinner />
        ) : listings.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
                  celebrity_id={item.celebrity_id}
                  listing_type={item.listing_type}
                  bids={item.bids}
                  auction={auctionMap[item.id] || null}
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
    </PullToRefresh>
  );
}
