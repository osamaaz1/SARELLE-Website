'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/marketplace/product-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

export default function SellerClosetPage() {
  const { sellerId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sellerId) {
      api.getCloset(sellerId as string)
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [sellerId]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!data) return <div className="text-center py-20 text-wimc-subtle">Seller not found</div>;

  const displayName = data.seller.display_name || 'Seller';

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[13px] text-[#888] hover:text-white transition-colors mb-5 bg-transparent border-none cursor-pointer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>

      <div className="flex items-center gap-4 mb-10">
        {/* Avatar with gradient circle */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-[#ccc] flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-extrabold text-black font-heading">{displayName[0]}</span>
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {displayName}
            {data.seller.verified && <span className="text-[#666] text-[14px] ml-1">&#10003;</span>}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge color="#FFBB44">{data.seller.tier}</Badge>
            <span className="text-sm text-wimc-subtle">{data.listings.length} items</span>
          </div>
        </div>
      </div>

      {data.listings.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {data.listings.map((item: any) => (
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
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No items yet" description="This seller hasn't listed any items yet" />
      )}
    </div>
  );
}
