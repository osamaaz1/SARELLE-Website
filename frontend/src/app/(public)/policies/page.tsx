export default function PoliciesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-heading text-3xl font-bold mb-10">How WIMC Works</h1>

      <div className="space-y-12 text-wimc-muted">
        <section>
          <h2 className="font-heading text-xl font-semibold text-white mb-4">Our Process</h2>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>Every item sold on WIMC goes through our professional hub. We handle pickup, authentication, photography, and shipping so you can buy and sell with complete confidence.</p>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li><strong className="text-white">Submit</strong> — Upload photos and details of your item</li>
              <li><strong className="text-white">Price Proposal</strong> — Our team reviews and suggests a listing price</li>
              <li><strong className="text-white">Pickup</strong> — We send a driver to collect from your location</li>
              <li><strong className="text-white">Authentication</strong> — Professional QC at our hub</li>
              <li><strong className="text-white">Photography</strong> — Studio-quality photos taken</li>
              <li><strong className="text-white">Listing</strong> — Item goes live on the marketplace</li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-semibold text-white mb-4">Fees & Commissions</h2>
          <div className="space-y-3 text-sm leading-relaxed">
            <p><strong className="text-white">Buyer Service Fee:</strong> 20% added to the item price at checkout</p>
            <p><strong className="text-white">Shipping Fee:</strong> Flat $50 per order</p>
            <p><strong className="text-white">Seller Commission:</strong> Based on your tier:</p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>Bronze (0+ points) — 20% commission</li>
              <li>Silver (500+ points) — 18% commission</li>
              <li>Gold (1,500+ points) — 15% commission</li>
              <li>Platinum (5,000+ points) — 12% commission</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-semibold text-white mb-4">Buyer Protection</h2>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>Every item is professionally authenticated before listing. After delivery, you have a <strong className="text-white">3-day inspection window</strong> to verify the item matches its description.</p>
            <p>If there&apos;s an issue, contact us within the inspection period for a full refund. Seller payouts are held until the inspection window closes.</p>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-semibold text-white mb-4">Authentication</h2>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>Our expert team inspects every item for authenticity. We check materials, stitching, hardware, serial numbers, and more. Items that fail authentication are returned to the seller.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
