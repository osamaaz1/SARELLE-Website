import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferModal } from '@/components/marketplace/offer-modal';

describe('OfferModal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    listingName: 'Chanel Classic Flap',
    listingPrice: 45000,
  };

  beforeEach(() => {
    defaultProps.onClose = jest.fn();
    defaultProps.onSubmit = jest.fn();
  });

  test('renders listing name and price', () => {
    render(<OfferModal {...defaultProps} />);
    expect(screen.getByText(/Chanel Classic Flap/)).toBeInTheDocument();
    expect(screen.getByText(/45,000/)).toBeInTheDocument();
  });

  test('shows error for zero or empty amount', async () => {
    const user = userEvent.setup();
    render(<OfferModal {...defaultProps} />);

    const input = screen.getByRole('spinbutton') || screen.getByPlaceholderText(/amount|offer|price/i);
    await user.clear(input);
    await user.type(input, '0');

    const submitButton = screen.getByRole('button', { name: /submit|send|make/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/greater than|minimum|valid|must be/i)).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  test('shows error when amount is greater than or equal to listing price', async () => {
    const user = userEvent.setup();
    render(<OfferModal {...defaultProps} />);

    const input = screen.getByRole('spinbutton') || screen.getByPlaceholderText(/amount|offer|price/i);
    await user.clear(input);
    await user.type(input, '50000');

    const submitButton = screen.getByRole('button', { name: /submit|send|make/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/less than|lower|below|cannot exceed/i)).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  test('calls onSubmit with valid amount', async () => {
    const user = userEvent.setup();
    render(<OfferModal {...defaultProps} />);

    const input = screen.getByRole('spinbutton') || screen.getByPlaceholderText(/amount|offer|price/i);
    await user.clear(input);
    await user.type(input, '30000');

    const submitButton = screen.getByRole('button', { name: /submit|send|make/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(30000);
    });
  });
});
