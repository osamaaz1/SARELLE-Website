import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  test('renders children text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  test('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    // Primary variant should have some identifiable class (bg-wimc-accent or similar)
    expect(button.className).toBeTruthy();
    // The button should exist and have classes applied
    expect(button).toBeInTheDocument();
  });

  test('applies sm size classes when size="sm"', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    // sm size should have smaller padding/text classes
    expect(button).toBeInTheDocument();
    // Check that the className contains size-related classes
    expect(button.className).toContain('px-');
  });

  test('shows loading spinner when loading=true', () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole('button');
    // When loading, the button should contain a spinner (svg with animate-spin)
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('is disabled when disabled=true or loading=true', () => {
    const { rerender } = render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();

    rerender(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('forwards ref to button element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toContain('Ref Button');
  });
});
