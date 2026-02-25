'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/marketplace/product-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function CelebritiesPage() {
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewCeleb, setViewCeleb] = useState<any>(null);

  useEffect(() => {
    api.getCelebrityListings()
      .then((data) => {
        if (Array.isArray(data)) setCelebrities(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  // Celebrity detail view
  if (viewCeleb) {
    const items: any[] = viewCeleb.listings ?? [];
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-8 animate-fade-in">
        {/* Back */}
        <button
          onClick={() => setViewCeleb(null)}
          className="flex items-center gap-1.5 text-[13px] text-[#888] hover:text-white transition-colors mb-5 bg-transparent border-none cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>

        {/* Celeb header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-[#ccc] flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-extrabold text-black font-heading">
              {viewCeleb.name?.[0] ?? '?'}
            </span>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold mb-0.5">
              {viewCeleb.name}{' '}
              <span className="text-[#44BB66] text-[14px]">&#10003;</span>
            </h2>
            <p className="text-[13px] text-[#666]">
              {viewCeleb.bio}
              {viewCeleb.followers ? ` · ${viewCeleb.followers}` : ''}
              {items.length > 0 ? ` · ${items.length} items` : ''}
            </p>
          </div>
        </div>

        {/* Auction-only notice */}
        <div className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-black rounded-[10px] border border-[#222] w-fit">
          <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
          <span className="text-[11px] font-bold tracking-[1px] text-white">AUCTION ONLY — No direct purchase available</span>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
            {items.map((item: any) => (
              <ProductCard
                key={item.id}
                id={item.id}
                name={item.name}
                brand={item.brand}
                price={item.price}
                photos={item.photos ?? []}
                condition={item.condition}
                category={item.category}
                originalPrice={item.original_price ?? undefined}
                bidding={item.bidding ?? true}
                bids={item.bids ?? []}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-wimc-surface rounded-2xl border border-wimc-border">
            <p className="text-[14px] font-semibold text-wimc-muted">No items yet</p>
          </div>
        )}
      </div>
    );
  }

  // Celebrity list view
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 animate-fade-in">
      <h1 className="font-heading text-[28px] font-bold mb-1.5">Celebrity Closets</h1>
      <p className="text-[14px] text-[#666] mb-7">
        Exclusive pre-loved pieces from verified celebrities — available by auction only
      </p>

      {celebrities.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-wimc-subtle">Celebrity closets coming soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {celebrities.map((celeb: any) => (
            <div
              key={celeb.id}
              onClick={() => setViewCeleb(celeb)}
              className="flex items-center gap-3.5 px-5 py-4 cursor-pointer bg-wimc-surface rounded-[14px] border border-wimc-border hover:border-[#444] transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-[#ccc] flex items-center justify-center flex-shrink-0">
                <span className="text-[18px] font-extrabold text-black font-heading">
                  {celeb.name?.[0] ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold mb-0.5">
                  {celeb.name}{' '}
                  <span className="text-[#44BB66]">&#10003;</span>
                </p>
                <p className="text-[12px] text-[#555] truncate">
                  {celeb.bio}
                  {celeb.followers ? ` · ${celeb.followers}` : ''}
                  {celeb.totalItems ? ` · ${celeb.totalItems} items` : ''}
                </p>
              </div>
              <span className="text-[#444] text-[18px]">&rarr;</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
