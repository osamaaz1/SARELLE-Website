'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/marketplace/product-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HomePage() {
  const [featured, setFeatured] = useState<any[]>([]);
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getFeaturedListings().catch(() => []),
      api.getCelebrityListings().catch(() => []),
    ]).then(([feat, celebs]) => {
      setFeatured(feat || []);
      setCelebrities(celebs || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  // Find a featured/bidding item for the hero
  const heroItem = featured.find((p: any) => p.bidding) || featured[0];

  return (
    <div className="animate-fade-in">
      {/* Hero — Featured Product */}
      {heroItem && (
        <Link href={`/listing/${heroItem.id}`} className="block bg-black border-b border-wimc-border">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-center md:gap-12 py-10">
              {/* Image */}
              <div className="w-full md:max-w-[400px] aspect-[4/3] rounded-2xl overflow-hidden bg-[#1A1A1A] flex-shrink-0 mb-5 md:mb-0">
                {heroItem.photos?.[0] ? (
                  <img src={heroItem.photos[0]} alt={heroItem.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[11px] font-bold tracking-[3px] text-[#333]">SARELLE</span>
                  </div>
                )}
              </div>
              {/* Details */}
              <div>
                {heroItem.bidding && (
                  <span className="inline-block text-[10px] font-bold tracking-[3px] text-white mb-2 px-3 py-1 border border-[#333] rounded">
                    LIVE AUCTION
                  </span>
                )}
                <h2 className="font-heading text-[32px] font-bold leading-[1.2] mb-2">
                  {heroItem.brand} {heroItem.name}
                </h2>
                <p className="text-[14px] text-[#666] mb-4">
                  {heroItem.condition}{heroItem.bids?.length ? ` · ${heroItem.bids.length} bids` : ''}
                </p>
                <div className="flex gap-8">
                  <div>
                    <p className="text-[11px] text-[#555] mb-0.5">Starting</p>
                    <p className="text-[18px] font-semibold text-[#888]">${heroItem.price?.toLocaleString()}</p>
                  </div>
                  {heroItem.bidding && (
                    <div>
                      <p className="text-[11px] text-[#555] mb-0.5">Current Bid</p>
                      <p className="text-[28px] font-extrabold text-white">
                        {heroItem.bids?.length
                          ? '$' + Math.max(...heroItem.bids.map((b: any) => b.amt)).toLocaleString()
                          : '\u2014'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Celebrity Closets */}
      {celebrities.length > 0 && (
        <div className="max-w-[1200px] mx-auto px-6 pt-10">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="font-heading text-[22px] font-semibold">Celebrity Closets</h2>
            <Link href="/celebrities" className="text-[13px] text-[#888] hover:text-white transition-colors">
              See all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {celebrities.slice(0, 4).map((celeb: any) => (
              <Link
                key={celeb.id}
                href="/celebrities"
                className="bg-wimc-surface rounded-[14px] p-5 text-center border border-wimc-border hover:border-[#444] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-[#ccc] mx-auto mb-2.5 flex items-center justify-center">
                  <span className="text-[18px] font-extrabold text-black font-heading">
                    {celeb.name?.[0] || '?'}
                  </span>
                </div>
                <p className="text-[14px] font-bold mb-0.5">
                  {celeb.name} <span className="text-[#666]">&#10003;</span>
                </p>
                <p className="text-[11px] text-[#555]">
                  {celeb.bio} · {celeb.followers}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trending */}
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <h2 className="font-heading text-[22px] font-semibold mb-5">Trending</h2>
        {featured.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {featured.slice(0, 8).map((item: any) => (
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
        ) : (
          <div className="text-center py-16">
            <p className="text-wimc-subtle">No items yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
