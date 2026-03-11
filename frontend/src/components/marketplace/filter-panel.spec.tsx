import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from '@/components/marketplace/filter-panel';

describe('FilterPanel', () => {
  const defaultProps = {
    filters: { category: 'All', brand: '', condition: '', sort: 'newest' },
    onChange: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onChange = jest.fn();
  });

  const categories = ['All', 'Bags', 'Shoes', 'Clothing', 'Watches', 'Jewellery'];

  test('renders all category buttons', () => {
    render(<FilterPanel {...defaultProps} />);
    for (const cat of categories) {
      expect(screen.getByText(cat)).toBeInTheDocument();
    }
  });

  test('highlights the active category', () => {
    render(<FilterPanel filters={{ ...defaultProps.filters, category: 'Bags' }} onChange={defaultProps.onChange} />);
    const bagsButton = screen.getByText('Bags');
    const shoesButton = screen.getByText('Shoes');
    expect(bagsButton.className).not.toBe(shoesButton.className);
  });

  test('calls onChange when a category is clicked', () => {
    render(<FilterPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Shoes'));
    expect(defaultProps.onChange).toHaveBeenCalledWith('category', 'Shoes');
  });

  test('renders sort dropdown with options', () => {
    render(<FilterPanel {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });
});
