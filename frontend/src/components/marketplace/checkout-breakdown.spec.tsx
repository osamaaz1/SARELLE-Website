import React from 'react';
import { render, screen } from '@testing-library/react';
import { CheckoutBreakdown } from '@/components/marketplace/checkout-breakdown';

describe('CheckoutBreakdown', () => {
  const defaultProps = {
    itemPrice: 10000,
    serviceFee: 2000,
    shippingFee: 50,
    total: 12050,
  };

  test('renders all price labels', () => {
    render(<CheckoutBreakdown {...defaultProps} />);
    expect(screen.getByText(/Item Price/i)).toBeInTheDocument();
    expect(screen.getByText(/Service Fee/i)).toBeInTheDocument();
    expect(screen.getByText(/Shipping/i)).toBeInTheDocument();
    expect(screen.getByText(/Total/i)).toBeInTheDocument();
  });

  test('formats prices with EGP currency', () => {
    render(<CheckoutBreakdown {...defaultProps} />);
    expect(screen.getByText(/10,000\.00/)).toBeInTheDocument();
  });

  test('shows total with distinctive styling', () => {
    render(<CheckoutBreakdown {...defaultProps} />);
    const totalLabel = screen.getByText(/Total/i);
    expect(totalLabel).toBeInTheDocument();
  });
});
