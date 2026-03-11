'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useSharedCountdown } from '@/hooks/useCountdown';
import { formatPrice } from '@/lib/currency';

interface ProductCardProps {
  id: string;
  name: string;
  brand: string;
  price: number;
  photos: string[];
  condition: string;
  category: string;
  sellerName?: string;
  featured?: boolean;
  originalPrice?: number;
  bidding?: boolean;
  celebrity_id?: string | null;
  listing_type?: string;
  bids?: { amt: number }[];
  auction?: {
    current_price: number;
    bid_count: number;
    ends_at: string;
    reserve_met?: boolean;
  } | null;
}

function MiniCountdown({ endsAt }: { endsAt: string }) {
  const text = useSharedCountdown(endsAt);
  return <span className="text-[10px] text-[#888] tabular-nums">{text}</span>;
}

export function ProductCard({ id, name, brand, price, photos, condition, category, featured, originalPrice, bidding, celebrity_id, listing_type, bids, auction }: ProductCardProps) {
  // Celebrity items = auction, Regular items = fixed price
  const isAuctionItem = !!(celebrity_id || bidding || listing_type === 'auction');
  const [saved, setSaved] = useState(false);
  const displayPrice = auction?.current_price || (bids?.length ? Math.max(...bids.map(b => b.amt)) : 0);
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;
  const bidCount = auction?.bid_count ?? bids?.length ?? 0;

  return (
    <Link href={`/listing/${id}`} className="group block">
      <div className="bg-wimc-surface rounded-[14px] border border-wimc-border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[#444]">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-[#1A1A1A] overflow-hidden">
          {photos[0] ? (
            <Image src={photos[0]} alt={name} fill className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] active:scale-[1.03]" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[11px] font-bold tracking-[3px] text-[#333]">WIMC</span>
            </div>
          )}
          {/* Save/Heart button — 44x44 touch target */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaved(!saved); }}
            className="absolute top-2 right-2 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? '#FF4444' : 'none'} stroke={saved ? '#FF4444' : '#555'} strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
          {/* Badges */}
          {isAuctionItem && (
            <div className="absolute bottom-2 left-2 bg-white text-black px-3 py-1.5 text-[10px] font-bold tracking-[1.5px] rounded">
              LIVE AUCTION
            </div>
          )}
          {!isAuctionItem && originalPrice && discount > 0 && (
            <div className="absolute bottom-2 left-2 bg-wimc-red text-white px-3 py-1.5 text-[10px] font-bold rounded">
              PRICE DROP
            </div>
          )}
        </div>
        {/* Info */}
        <div className="px-3 pt-2.5 pb-3">
          <p className="text-[10px] sm:text-[11px] font-bold tracking-[2px] text-wimc-dim mb-1">{brand}</p>
          <p className="text-[13px] sm:text-[14px] font-medium leading-[1.3] line-clamp-2 mb-1.5">{name}</p>
          <div className="flex gap-1.5 items-baseline">
            {!isAuctionItem && originalPrice && discount > 0 && (
              <span className="text-[11px] sm:text-[12px] text-[#444] line-through">{formatPrice(originalPrice)}</span>
            )}
            <span className={`text-[15px] sm:text-[16px] font-bold ${!isAuctionItem && originalPrice && discount > 0 ? 'text-wimc-red' : 'text-white'}`}>
              {isAuctionItem && displayPrice > 0 ? formatPrice(displayPrice) : formatPrice(price)}
            </span>
            {!isAuctionItem && originalPrice && discount > 0 && (
              <span className="text-[11px] sm:text-[12px] font-bold text-wimc-red">-{discount}%</span>
            )}
          </div>
          {/* Auction meta: bid count + countdown */}
          {isAuctionItem && (
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-[#666]">{bidCount} bid{bidCount !== 1 ? 's' : ''}</span>
              {auction?.ends_at && <MiniCountdown endsAt={auction.ends_at} />}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
