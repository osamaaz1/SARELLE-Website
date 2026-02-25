'use client';
import Link from 'next/link';
import { useState } from 'react';

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
  bids?: { amt: number }[];
}

export function ProductCard({ id, name, brand, price, photos, condition, category, featured, originalPrice, bidding, bids }: ProductCardProps) {
  const [saved, setSaved] = useState(false);
  const formatPrice = (n: number) => '$' + n.toLocaleString();
  const highestBid = bids?.length ? Math.max(...bids.map(b => b.amt)) : 0;
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <Link href={`/listing/${id}`} className="group block">
      <div className="bg-wimc-surface rounded-[14px] border border-wimc-border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[#444]">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-[#1A1A1A]">
          {photos[0] ? (
            <img src={photos[0]} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[11px] font-bold tracking-[3px] text-[#333]">SARELLE</span>
            </div>
          )}
          {/* Save/Heart button */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaved(!saved); }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? '#FF4444' : 'none'} stroke={saved ? '#FF4444' : '#555'} strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
          {/* Badges */}
          {bidding && (
            <div className="absolute bottom-2 left-2 bg-white text-black px-2.5 py-[3px] text-[9px] font-bold tracking-[1.5px] rounded">
              LIVE AUCTION
            </div>
          )}
          {!bidding && originalPrice && (
            <div className="absolute bottom-2 left-2 bg-wimc-red text-white px-2.5 py-[3px] text-[9px] font-bold rounded">
              PRICE DROP
            </div>
          )}
        </div>
        {/* Info */}
        <div className="px-2.5 pt-2 pb-2.5">
          <p className="text-[9px] font-bold tracking-[2px] text-wimc-dim mb-[3px]">{brand}</p>
          <p className="text-[11px] font-medium leading-[1.3] line-clamp-2 mb-1">{name}</p>
          <div className="flex gap-1 items-baseline">
            {originalPrice && (
              <span className="text-[10px] text-[#444] line-through">{formatPrice(originalPrice)}</span>
            )}
            <span className={`text-[13px] font-bold ${originalPrice ? 'text-wimc-red' : 'text-white'}`}>
              {bidding && highestBid ? formatPrice(highestBid) : formatPrice(price)}
            </span>
            {originalPrice && discount > 0 && (
              <span className="text-[10px] font-bold text-wimc-red">-{discount}%</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
