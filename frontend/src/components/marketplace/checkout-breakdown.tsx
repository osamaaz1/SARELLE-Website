'use client';

interface CheckoutBreakdownProps {
  itemPrice: number;
  serviceFee: number;
  shippingFee: number;
  total: number;
}

export function CheckoutBreakdown({ itemPrice, serviceFee, shippingFee, total }: CheckoutBreakdownProps) {
  const fmt = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-wimc-surface border border-wimc-border rounded-xl p-6 space-y-3">
      <h3 className="font-heading font-semibold text-lg mb-4">Order Summary</h3>
      <div className="flex justify-between text-sm">
        <span className="text-wimc-muted">Item Price</span>
        <span>{fmt(itemPrice)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-wimc-muted">Service Fee (20%)</span>
        <span>{fmt(serviceFee)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-wimc-muted">Shipping</span>
        <span>{fmt(shippingFee)}</span>
      </div>
      <div className="border-t border-wimc-border pt-3 flex justify-between font-semibold text-lg">
        <span>Total</span>
        <span className="text-wimc-red">{fmt(total)}</span>
      </div>
    </div>
  );
}
