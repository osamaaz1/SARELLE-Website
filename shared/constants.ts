import { StageInfo } from './types';

// Categories
export const CATEGORIES = ['Bags', 'Shoes', 'Clothing', 'Watches', 'Jewellery'] as const;
export const CATEGORIES_WITH_ALL = ['All', ...CATEGORIES] as const;

// Brands
export const BRANDS = [
  'Herm\u00e8s', 'Chanel', 'Louis Vuitton', 'Gucci', 'Dior',
  'Prada', 'Louboutin', 'Cartier', 'Rolex', 'Fendi',
  'Valentino', 'Other',
] as const;

// Conditions
export const CONDITIONS = ['Like New', 'Excellent', 'Very Good', 'Good'] as const;

// Seller Tiers
export const SELLER_TIERS = [
  { name: 'Bronze', minPoints: 0, commission: 20 },
  { name: 'Silver', minPoints: 500, commission: 18 },
  { name: 'Gold', minPoints: 1500, commission: 15 },
  { name: 'Platinum', minPoints: 5000, commission: 12 },
] as const;

// Submission Stage metadata
export const STAGES: Record<string, StageInfo> = {
  pending_review: { label: 'Pending Review', color: '#FFBB44', step: 1 },
  price_suggested: { label: 'Price Suggested', color: '#88BBFF', step: 2 },
  price_accepted: { label: 'Price Accepted', color: '#44DD66', step: 3 },
  price_rejected: { label: 'Price Rejected', color: '#FF4444', step: 0 },
  pickup_scheduled: { label: 'Pickup Scheduled', color: '#FF8844', step: 4 },
  driver_dispatched: { label: 'Driver Dispatched', color: '#AA88FF', step: 5 },
  arrived_at_office: { label: 'At Office', color: '#88BBFF', step: 6 },
  auth_failed: { label: 'Auth Failed', color: '#FF4444', step: 7 },
  auth_passed: { label: 'Authenticated', color: '#44DD66', step: 7 },
  photoshoot_done: { label: 'Photoshoot Done', color: '#AA88FF', step: 8 },
  listed: { label: 'Listed', color: '#44DD66', step: 9 },
  rejected: { label: 'Rejected', color: '#FF4444', step: 0 },
};

// Order Status Labels
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  inspection_window: 'Inspection Window',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

// Offer Status Labels
export const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

// Service Fee
export const SERVICE_FEE_RATE = 0.20;
export const DEFAULT_SHIPPING_FEE = 50;

// Format helpers
export const formatPrice = (n: number): string => '$' + n.toLocaleString();
