export const CELEBS = [
  { id: "c1", name: "Yasmine Sabri", bio: "Actress", followers: "2.1M", items: ["p1", "p2"] },
  { id: "c2", name: "Mohamed Ramadan", bio: "Actor", followers: "5.8M", items: ["p14"] },
  { id: "c3", name: "Hend Sabry", bio: "Actress", followers: "3.4M", items: ["p9"] },
  { id: "c4", name: "Amr Diab", bio: "Singer", followers: "8.2M", items: [] },
];

export const STAGES = {
  pending_review: { label: "Pending Review", color: "#FFBB44", step: 1 },
  price_suggested: { label: "Price Suggested", color: "#88BBFF", step: 2 },
  price_accepted: { label: "Price Accepted", color: "#44DD66", step: 3 },
  pickup_scheduled: { label: "Pickup Scheduled", color: "#FF8844", step: 4 },
  driver_dispatched: { label: "Driver Dispatched", color: "#AA88FF", step: 5 },
  arrived_at_office: { label: "At Office", color: "#88BBFF", step: 6 },
  auth_failed: { label: "Auth Failed", color: "#FF4444", step: 7 },
  auth_passed: { label: "Authenticated", color: "#44DD66", step: 7 },
  photoshoot_done: { label: "Photoshoot Done", color: "#AA88FF", step: 8 },
  listed: { label: "Listed", color: "#44DD66", step: 9 },
  rejected: { label: "Rejected", color: "#FF4444", step: 0 },
  price_rejected: { label: "Price Rejected", color: "#FF4444", step: 0 },
};

// Merged initial data (admin's workflow items + website's seller/bids/pickups fields)
export const INIT = {
  products: [
    { id: "p1", sellerId: "c1", celeb: true, brand: "HERM\u00c8S", name: "Birkin 35 Himalaya Croc", cat: "Bags", price: 45000, cond: "Excellent", status: "live", bidding: true, bids: [{ u: "A", amt: 42000, t: "5h" }, { u: "B", amt: 43500, t: "2h" }, { u: "C", amt: 44000, t: "30m" }], offers: [], saved: [] },
    { id: "p2", sellerId: "c1", celeb: true, brand: "HERM\u00c8S", name: "Kelly 28 Epsom Black", cat: "Bags", price: 15300, cond: "Very Good", status: "live", bidding: false, bids: [], offers: [], saved: [] },
    { id: "p14", sellerId: "c2", celeb: true, brand: "HERM\u00c8S", name: "Birkin 30 Croc Ombr\u00e9", cat: "Bags", price: 26300, cond: "Like New", status: "live", bidding: true, bids: [{ u: "D", amt: 24000, t: "3h" }, { u: "E", amt: 25100, t: "1h" }], offers: [], saved: [] },
    { id: "p9", sellerId: "c3", celeb: true, brand: "HERM\u00c8S", name: "Kelly 28 Rose Sakura", cat: "Bags", price: 18500, orig: 22000, cond: "Excellent", status: "live", bidding: false, bids: [], offers: [], saved: [] },
    { id: "p4", sellerId: "s1", brand: "LOUIS VUITTON", name: "Neverfull MM Monogram", cat: "Bags", price: 1650, orig: 2100, cond: "Very Good", status: "live", bidding: false, bids: [], offers: [{ id: "o2", buyer: "ExtBuyer", amt: 1400, status: "pending", t: "1h" }], saved: [] },
    { id: "p5", sellerId: "s1", brand: "CHANEL", name: "Classic Flap Medium Caviar", cat: "Bags", price: 8900, orig: 10200, cond: "Good", status: "live", bidding: false, bids: [], offers: [], saved: [] },
    { id: "p6", sellerId: "s2", brand: "LOUBOUTIN", name: "So Kate 120 Patent Nude", cat: "Shoes", price: 495, orig: 745, cond: "Good", status: "live", bidding: false, bids: [], offers: [], saved: [] },
    { id: "p7", sellerId: "s1", brand: "GUCCI", name: "Horsebit 1955 Shoulder", cat: "Bags", price: 2100, cond: "Like New", status: "live", bidding: false, bids: [], offers: [], saved: [] },
    { id: "p8", sellerId: "s2", brand: "DIOR", name: "Lady Dior Medium Lambskin", cat: "Bags", price: 4200, orig: 5200, cond: "Very Good", status: "live", bidding: false, bids: [], offers: [], saved: [] },
    { id: "p10", sellerId: "s1", brand: "CARTIER", name: "Love Bracelet 18K Gold", cat: "Jewellery", price: 6200, cond: "Excellent", status: "live", bidding: false, bids: [], offers: [], saved: [] },
    { id: "p11", sellerId: "s2", brand: "ROLEX", name: "Datejust 36 Oyster Steel", cat: "Watches", price: 8450, cond: "Excellent", status: "live", bidding: false, bids: [], offers: [], saved: [] },
  ],
  seller: { id: "s1", name: "Nadia's Closet", points: 750, sales: 8, earnings: 12400 },
  orders: [
    { id: "or1", brand: "FENDI", name: "Peekaboo Mini", price: 2200, type: "sale", status: "paid", payout: 1760 },
    { id: "or3", brand: "VALENTINO", name: "Rockstud Heels", price: 650, type: "sale", status: "pending_payout", payout: 533 },
    { id: "or4", brand: "DIOR", name: "Lady Dior", price: 4200, type: "purchase", status: "delivering", tracking: "WMC-0219", eta: "Feb 25" },
  ],
  pickups: [{ id: "pk1", brand: "Fendi", name: "Baguette Sequin", status: "under_review", date: "Feb 18", cat: "Bags", cond: "Excellent", color: "Gold", desc: "Iconic sequin baguette, minor wear on strap" }],
  myBids: [{ prodId: "p1", amt: 44500, status: "winning" }, { prodId: "p14", amt: 25500, status: "outbid" }],
  myOffersMade: [],
  workflow: [
    { id: "wf1", sellerId: "s1", userName: "Sara Ahmed", userPhone: "+20 100 555 1234", brand: "HERM\u00c8S", name: "Birkin 25 Togo Gold", cat: "Bags", cond: "Excellent", color: "Gold", desc: "Pristine Birkin 25 in Togo leather. Comes with dust bag, box, and receipt.", userPhotos: ["\ud83d\udcf7 Front", "\ud83d\udcf7 Back", "\ud83d\udcf7 Interior", "\ud83d\udcf7 Hardware"], stage: "pending_review", createdAt: "Feb 19, 2026", suggestedPrice: null, pickupDate: null, pickupTime: null, pickupAddress: null, driverPhone: null, adminNotes: "", proPhotos: [], proDesc: "", history: [{ t: "Feb 19", msg: "Item submitted by Sara Ahmed" }] },
    { id: "wf2", sellerId: "s2", userName: "Nadia El-Sayed", userPhone: "+20 101 777 9876", brand: "CHANEL", name: "Classic Flap Medium Caviar", cat: "Bags", cond: "Very Good", color: "Black", desc: "Classic double flap in black caviar with gold hardware. Minor corner wear.", userPhotos: ["\ud83d\udcf7 Front", "\ud83d\udcf7 Back", "\ud83d\udcf7 Serial"], stage: "pending_review", createdAt: "Feb 20, 2026", suggestedPrice: null, pickupDate: null, pickupTime: null, pickupAddress: null, driverPhone: null, adminNotes: "", proPhotos: [], proDesc: "", history: [{ t: "Feb 20", msg: "Item submitted by Nadia El-Sayed" }] },
    { id: "wf3", sellerId: "s1", userName: "Sara Ahmed", userPhone: "+20 100 555 1234", brand: "GUCCI", name: "Marmont Small Shoulder", cat: "Bags", cond: "Excellent", color: "Dusty Pink", desc: "GG Marmont in matelass\u00e9 leather. Minor scratches on hardware.", userPhotos: ["\ud83d\udcf7 Front", "\ud83d\udcf7 Back", "\ud83d\udcf7 Chain"], stage: "pickup_scheduled", createdAt: "Feb 12, 2026", suggestedPrice: 1900, pickupDate: "Feb 22, 2026", pickupTime: "2:00 PM", pickupAddress: "15 El-Tahrir St, Dokki, Giza", driverPhone: null, adminNotes: "", proPhotos: [], proDesc: "", history: [{ t: "Feb 12", msg: "Item submitted" }, { t: "Feb 13", msg: "Price suggested: $1,900" }, { t: "Feb 13", msg: "Price accepted" }, { t: "Feb 14", msg: "Pickup scheduled" }] },
    { id: "wf4", sellerId: "s3", userName: "Reem Mostafa", userPhone: "+20 106 888 3344", brand: "CARTIER", name: "Love Bracelet 18K Rose Gold", cat: "Jewellery", cond: "Excellent", color: "Rose Gold", desc: "Size 17. Complete set with screwdriver, box, certificate.", userPhotos: ["\ud83d\udcf7 Bracelet", "\ud83d\udcf7 Certificate", "\ud83d\udcf7 Box"], stage: "arrived_at_office", createdAt: "Feb 8, 2026", suggestedPrice: 6500, pickupDate: "Feb 14", pickupTime: "11:00 AM", pickupAddress: "22 Road 9, Maadi, Cairo", driverPhone: "+20 100 999 0000", adminNotes: "", proPhotos: [], proDesc: "", history: [{ t: "Feb 8", msg: "Item submitted" }, { t: "Feb 9", msg: "Price suggested: $6,500" }, { t: "Feb 10", msg: "Pickup scheduled" }, { t: "Feb 14", msg: "Item arrived at office" }] },
    { id: "wf5", sellerId: "s3", userName: "Reem Mostafa", userPhone: "+20 106 888 3344", brand: "ROLEX", name: "Datejust 36 Blue Dial", cat: "Watches", cond: "Excellent", color: "Silver/Blue", desc: "Full set with box and papers. Serviced 2024.", userPhotos: ["\ud83d\udcf7 Watch", "\ud83d\udcf7 Papers"], stage: "auth_passed", createdAt: "Feb 5, 2026", suggestedPrice: 9200, pickupAddress: "8 Corniche El Nil, Garden City", driverPhone: "+20 100 999 0000", adminNotes: "Genuine Rolex confirmed.", proPhotos: [], proDesc: "", history: [{ t: "Feb 5", msg: "Item submitted" }, { t: "Feb 6", msg: "Price suggested: $9,200" }, { t: "Feb 8", msg: "Delivered to office" }, { t: "Feb 10", msg: "Authentication PASSED \u2713" }] },
  ],
  sellers: [
    { id: "s1", name: "Sara Ahmed", phone: "+20 100 555 1234", points: 750, sales: 8, earnings: 12400, status: "active" },
    { id: "s2", name: "Nadia El-Sayed", phone: "+20 101 777 9876", points: 320, sales: 4, earnings: 5800, status: "active" },
    { id: "s3", name: "Reem Mostafa", phone: "+20 106 888 3344", points: 150, sales: 2, earnings: 3200, status: "active" },
  ],
  celebs: [
    { id: "c1", name: "Yasmine Sabri", bio: "Actress", followers: "2.1M", items: ["p1", "p2"] },
    { id: "c2", name: "Mohamed Ramadan", bio: "Actor", followers: "5.8M", items: ["p14"] },
    { id: "c3", name: "Hend Sabry", bio: "Actress", followers: "3.4M", items: ["p9"] },
    { id: "c4", name: "Amr Diab", bio: "Singer", followers: "8.2M", items: [] },
  ],
  notifications: [],
};
