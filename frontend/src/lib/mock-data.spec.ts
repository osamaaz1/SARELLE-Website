import { MOCK_LISTINGS, MOCK_CELEBRITIES, MOCK_AUCTIONS } from '@/lib/mock-data';

describe('mock-data', () => {
  test('MOCK_LISTINGS entries have required fields', () => {
    expect(MOCK_LISTINGS.length).toBeGreaterThan(0);
    for (const listing of MOCK_LISTINGS) {
      expect(listing).toHaveProperty('id');
      expect(listing).toHaveProperty('brand');
      expect(listing).toHaveProperty('name');
      expect(listing).toHaveProperty('price');
      expect(listing).toHaveProperty('category');
      expect(listing).toHaveProperty('photos');
    }
  });

  test('MOCK_CELEBRITIES all have name and followers', () => {
    expect(MOCK_CELEBRITIES.length).toBeGreaterThan(0);
    for (const celeb of MOCK_CELEBRITIES) {
      expect(celeb).toHaveProperty('name');
      expect(typeof celeb.name).toBe('string');
      expect(celeb).toHaveProperty('followers');
    }
  });

  test('MOCK_AUCTIONS reference valid listing IDs', () => {
    const listingIds = new Set(MOCK_LISTINGS.map((l) => l.id));
    for (const auction of MOCK_AUCTIONS) {
      expect(listingIds.has(auction.listing_id)).toBe(true);
    }
  });
});
