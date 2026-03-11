import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/ui/empty-state';

describe('EmptyState', () => {
  test('renders title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  test('renders description when provided', () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adjusting your filters"
      />
    );
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  test('renders action when provided', () => {
    const action = <button>Browse All</button>;
    render(
      <EmptyState
        title="No items found"
        action={action}
      />
    );
    expect(screen.getByRole('button', { name: /browse all/i })).toBeInTheDocument();
  });
});
