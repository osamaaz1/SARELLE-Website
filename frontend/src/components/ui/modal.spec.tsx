import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/modal';

describe('Modal', () => {
  const defaultProps = {
    open: false,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onClose = jest.fn();
    // Reset body overflow
    document.body.style.overflow = '';
  });

  test('renders nothing when open=false', () => {
    const { container } = render(
      <Modal {...defaultProps}>
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  test('renders children when open=true', () => {
    render(
      <Modal {...defaultProps} open={true}>
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('renders title when provided', () => {
    render(
      <Modal {...defaultProps} open={true} title="Test Title">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  test('sets body overflow to hidden when open', () => {
    render(
      <Modal {...defaultProps} open={true}>
        <p>Content</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  test('calls onClose when overlay is clicked', () => {
    render(
      <Modal {...defaultProps} open={true}>
        <p>Content</p>
      </Modal>
    );
    // The overlay is the outermost fixed div (grandparent of content container)
    // Modal checks mouseDownTarget === overlayRef.current && e.target === overlayRef.current
    const contentEl = screen.getByText('Content');
    // Navigate up: p > div.p-6 > div.max-w-lg > div.fixed (overlay)
    const overlay = contentEl.closest('.fixed');
    expect(overlay).toBeTruthy();
    if (overlay) {
      fireEvent.mouseDown(overlay, { target: overlay });
      fireEvent.click(overlay, { target: overlay });
    }
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
