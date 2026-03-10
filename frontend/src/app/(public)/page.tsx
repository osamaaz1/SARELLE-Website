'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/marketplace/product-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { formatPrice } from '@/lib/currency';

export default function HomePage() {
  const [featured, setFeatured] = useState<any[]>([]);
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [auctionMap, setAuctionMap] = useState<Record<string, any>>({});
  const [heroAuction, setHeroAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [feat, celebs] = await Promise.all([
      api.getFeaturedListings().catch(() => []),
      api.getCelebrityListings().catch(() => []),
    ]);
    const items = feat || [];
    setFeatured(items);
    setCelebrities(celebs || []);

    // Fetch auction data for celebrity items (auction only)
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

      // Set hero auction from celebrity items
      const heroItem = items.find((p: any) => p.celebrity_id) || items.find((p: any) => p.bidding) || items[0];
      if (heroItem && map[heroItem.id]) {
        setHeroAuction(map[heroItem.id]);
      }
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  // Find a celebrity item for the hero
  const heroItem = featured.find((p: any) => p.celebrity_id) || featured.find((p: any) => p.bidding) || featured[0];

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="animate-fade-in">
      {/* Hero — Featured Product */}
      {heroItem && (
        <Link href={`/listing/${heroItem.id}`} className="block bg-black border-b border-wimc-border">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-center md:gap-12 py-10">
              {/* Image */}
              <div className="w-full md:max-w-[400px] aspect-[4/3] rounded-2xl overflow-hidden bg-[#1A1A1A] flex-shrink-0 mb-5 md:mb-0 relative">
                {heroItem.photos?.[0] ? (
                  <Image src={heroItem.photos[0]} alt={heroItem.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" priority />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[11px] font-bold tracking-[3px] text-[#333]">WIMC</span>
                  </div>
                )}
              </div>
              {/* Details */}
              <div>
                {(heroItem.celebrity_id || heroItem.bidding) && (
                  <span className="inline-block text-[10px] font-bold tracking-[3px] text-white mb-2 px-3 py-1 border border-[#333] rounded">
                    LIVE AUCTION
                  </span>
                )}
                <h2 className="font-heading text-[32px] font-bold leading-[1.2] mb-2">
                  {heroItem.brand} {heroItem.name}
                </h2>
                <p className="text-[14px] text-[#666] mb-4">
                  {heroItem.condition}
                  {(heroAuction?.bid_count || heroItem.bids?.length)
                    ? ` \u00b7 ${heroAuction?.bid_count || heroItem.bids.length} bids`
                    : ''}
                </p>
                <div className="flex gap-8">
                  <div>
                    <p className="text-[11px] text-[#555] mb-0.5">Starting</p>
                    <p className="text-[18px] font-semibold text-[#888]">
                      {formatPrice(heroAuction?.starting_price || heroItem.price)}
                    </p>
                  </div>
                  {(heroItem.celebrity_id || heroItem.bidding) && (
                    <div>
                      <p className="text-[11px] text-[#555] mb-0.5">Current Bid</p>
                      <p className="text-[28px] font-extrabold text-white">
                        {heroAuction?.current_price && heroAuction.bid_count > 0
                          ? formatPrice(heroAuction.current_price)
                          : heroItem.bids?.length
                            ? formatPrice(Math.max(...heroItem.bids.map((b: any) => b.amt)))
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
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory scrollbar-hide md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
            {celebrities.slice(0, 4).map((celeb: any) => (
              <Link
                key={celeb.id}
                href="/celebrities"
                className="bg-wimc-surface rounded-[14px] p-5 text-center border border-wimc-border hover:border-[#444] transition-colors flex-shrink-0 w-[160px] sm:w-[180px] md:w-auto snap-start"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-[#ccc] mx-auto mb-3 flex items-center justify-center">
                  <span className="text-[20px] font-extrabold text-black font-heading">
                    {celeb.name?.[0] || '?'}
                  </span>
                </div>
                <p className="text-[14px] font-bold mb-1">
                  {celeb.name} <span className="text-[#666]">&#10003;</span>
                </p>
                <p className="text-[13px] text-[#555]">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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
                celebrity_id={item.celebrity_id}
                listing_type={item.listing_type}
                bids={item.bids}
                auction={auctionMap[item.id] || null}
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
    </PullToRefresh>
  );
}
