import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/marketplace/product-card';

jest.mock('@/hooks/useCountdown', () => ({
  useSharedCountdown: jest.fn().mockReturnValue('2d 5h'),
}));

const baseProps = {
  id: 'listing-1',
  brand: 'Chanel',
  name: 'Classic Flap Bag',
  price: 45000,
  category: 'Bags',
  photos: ['https://picsum.photos/400'],
  condition: 'Excellent',
};

describe('ProductCard', () => {
  test('renders brand and name', () => {
    render(<ProductCard {...baseProps} />);
    expect(screen.getByText('Chanel')).toBeInTheDocument();
    expect(screen.getByText('Classic Flap Bag')).toBeInTheDocument();
  });

  test('renders price with formatted value', () => {
    render(<ProductCard {...baseProps} />);
    expect(screen.getByText(/45,000/)).toBeInTheDocument();
  });

  test('shows LIVE AUCTION badge for auction items', () => {
    render(
      <ProductCard
        {...baseProps}
        bidding={true}
        auction={{ current_price: 35000, bid_count: 5, ends_at: '2026-03-15T12:00:00Z' }}
      />
    );
    expect(screen.getByText('LIVE AUCTION')).toBeInTheDocument();
  });

  test('shows PRICE DROP badge for discounted items', () => {
    render(<ProductCard {...baseProps} originalPrice={60000} />);
    expect(screen.getByText('PRICE DROP')).toBeInTheDocument();
  });

  test('renders save/heart button', () => {
    render(<ProductCard {...baseProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
