export const fmt = n => "$" + n.toLocaleString();

// Website uses "All" as first category; admin does not
export const CATS = ["All", "Bags", "Shoes", "Clothing", "Watches", "Jewellery"];
export const CATS_ADMIN = ["Bags", "Shoes", "Clothing", "Watches", "Jewellery"];
export const BRANDS = ["Herm\u00e8s", "Chanel", "Louis Vuitton", "Gucci", "Dior", "Prada", "Louboutin", "Cartier", "Rolex", "Fendi", "Valentino", "Other"];
export const BRANDS_WEBSITE = ["Herm\u00e8s", "Chanel", "Louis Vuitton", "Gucci", "Dior", "Prada", "Other"];
export const CONDS = ["Like New", "Excellent", "Very Good", "Good"];
export const TIERS = [
  { n: "Bronze", min: 0, comm: 20 },
  { n: "Silver", min: 500, comm: 18 },
  { n: "Gold", min: 1500, comm: 15 },
  { n: "Platinum", min: 5000, comm: 12 },
];

// Fonts
export const FH = "'Playfair Display',serif";
export const FB = "'DM Sans',sans-serif";
export const FW = "'Dancing Script',cursive";
export const FONT = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Dancing+Script:wght@400;500;600;700&display=swap";

// Colors — website palette
export const C = {
  bg: "#0A0A0A",
  card: "#141414",
  card2: "#1C1C1C",
  bdr: "#222",
  bdr2: "#333",
  wh: "#fff",
  tx: "#fff",
  tm: "#aaa",
  tl: "#666",
  dim: "#555",
  red: "#FF4444",
  grn: "#44DD66",
  bl: "#88BBFF",
};

// Colors — admin palette (extends website with extras)
export const CA = {
  bg: "#0A0A0A",
  side: "#0F0F0F",
  card: "#141414",
  card2: "#1C1C1C",
  bdr: "#1E1E1E",
  bdr2: "#2A2A2A",
  wh: "#fff",
  red: "#FF4444",
  grn: "#44DD66",
  bl: "#88BBFF",
  ylw: "#FFBB44",
  pur: "#AA88FF",
  org: "#FF8844",
};
