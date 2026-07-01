import heroFarm from "@/assets/hero-farm.jpg";
import produceCrate from "@/assets/produce-crate.jpg";
import farmerPortrait from "@/assets/farmer-portrait.jpg";
import fruitStand from "@/assets/fruit-stand.jpg";
import dairyEggs from "@/assets/dairy-eggs.jpg";
import honeyJars from "@/assets/honey-jars.jpg";

export const images = {
  heroFarm,
  produceCrate,
  farmerPortrait,
  fruitStand,
  dairyEggs,
  honeyJars,
};

export const categories = [
  { slug: "vegetables", name: "Vegetables", emoji: "🥬" },
  { slug: "fruits", name: "Fruits", emoji: "🍎" },
  { slug: "dairy-eggs", name: "Dairy & Eggs", emoji: "🥛" },
  { slug: "meat-poultry", name: "Meat & Poultry", emoji: "🍖" },
  { slug: "honey-preserves", name: "Honey & Preserves", emoji: "🍯" },
  { slug: "grains", name: "Grains & Legumes", emoji: "🌾" },
  { slug: "herbs", name: "Herbs & Spices", emoji: "🌿" },
  { slug: "flowers", name: "Flowers & Plants", emoji: "🌸" },
  { slug: "artisan", name: "Artisan Foods", emoji: "🧀" },
  { slug: "nuts-seeds", name: "Nuts & Seeds", emoji: "🥜" },
];

export type Farm = {
  id: string;
  name: string;
  location: string;
  state: string;
  rating: number;
  reviews: number;
  distance: number;
  lat: number;
  lng: number;
  verified: boolean;
  topSeller?: boolean;
  image: string;
  description: string;
  certifications: string[];
  established: number;
  totalSales: number;
};

export const farms: Farm[] = [
  {
    id: "blue-ridge",
    name: "Blue Ridge Family Farm",
    location: "Asheville, NC",
    state: "North Carolina",
    rating: 4.9,
    reviews: 312,
    distance: 8.2,
    lat: 35.5951,
    lng: -82.5515,
    verified: true,
    topSeller: true,
    image: heroFarm,
    description:
      "Four generations of stewardship in the Blue Ridge foothills. We grow heirloom vegetables, raise pasture-fed chickens, and tap our own sourwood honey.",
    certifications: ["USDA Organic", "Non-GMO", "Family Owned"],
    established: 1948,
    totalSales: 2843,
  },
  {
    id: "sunrise-orchards",
    name: "Sunrise Orchards",
    location: "Walla Walla, WA",
    state: "Washington",
    rating: 4.8,
    reviews: 187,
    distance: 14.6,
    lat: 46.0646,
    lng: -118.343,
    verified: true,
    topSeller: true,
    image: fruitStand,
    description:
      "Award-winning stone fruit and heritage apples from the high desert. Picked at peak ripeness and shipped within 24 hours.",
    certifications: ["USDA Organic", "Non-GMO"],
    established: 1976,
    totalSales: 1921,
  },
  {
    id: "morning-glory",
    name: "Morning Glory Dairy",
    location: "Madison, WI",
    state: "Wisconsin",
    rating: 4.9,
    reviews: 426,
    distance: 22.1,
    lat: 43.0731,
    lng: -89.4012,
    verified: true,
    topSeller: true,
    image: dairyEggs,
    description:
      "Small-herd Jersey dairy producing creamline milk, butter, and artisan cheese. Cows on pasture 280+ days a year.",
    certifications: ["Pasture-Raised", "Non-GMO", "Animal Welfare Approved"],
    established: 1962,
    totalSales: 3204,
  },
  {
    id: "golden-meadow",
    name: "Golden Meadow Apiary",
    location: "Bozeman, MT",
    state: "Montana",
    rating: 4.7,
    reviews: 142,
    distance: 31.4,
    lat: 45.6769,
    lng: -111.0429,
    verified: true,
    image: honeyJars,
    description:
      "Single-origin raw honey and beeswax goods from 400 hives across the Gallatin Valley wildflower meadows.",
    certifications: ["Raw", "Unfiltered", "Small Batch"],
    established: 1989,
    totalSales: 1108,
  },
  {
    id: "river-bend",
    name: "River Bend Produce",
    location: "Lancaster, PA",
    state: "Pennsylvania",
    rating: 4.8,
    reviews: 264,
    distance: 5.7,
    lat: 40.0379,
    lng: -76.3055,
    verified: true,
    image: produceCrate,
    description:
      "Amish-country roots. We grow over 80 varieties of heirloom vegetables on 42 acres of rich limestone soil.",
    certifications: ["USDA Organic", "Heirloom", "Family Owned"],
    established: 1903,
    totalSales: 2105,
  },
  {
    id: "homestead-hollow",
    name: "Homestead Hollow Farm",
    location: "Austin, TX",
    state: "Texas",
    rating: 4.9,
    reviews: 198,
    distance: 12.9,
    lat: 30.2672,
    lng: -97.7431,
    verified: true,
    topSeller: true,
    image: farmerPortrait,
    description:
      "Grass-fed beef, pastured pork, and free-range eggs raised the right way on 220 acres of Hill Country pasture.",
    certifications: ["Grass-Fed", "Pasture-Raised", "Non-GMO"],
    established: 2008,
    totalSales: 1672,
  },
];

export type Product = {
  id: string;
  name: string;
  variety?: string;
  farmId: string;
  category: string;
  price: number;
  unit: string;
  image: string;
  delivery: "24h" | "48h";
  organic?: boolean;
  rating: number;
  reviews: number;
  stock: number;
  freshnessGrade: "A" | "B";
  freshnessScore: number;
  description: string;
};

export const products: Product[] = [
  {
    id: "heirloom-tomatoes",
    name: "Heirloom Tomato Mix",
    variety: "Cherokee Purple, Brandywine, Green Zebra",
    farmId: "river-bend",
    category: "vegetables",
    price: 5.5,
    unit: "lb",
    image: produceCrate,
    delivery: "24h",
    organic: true,
    rating: 4.9,
    reviews: 87,
    stock: 24,
    freshnessGrade: "A",
    freshnessScore: 9.4,
    description:
      "Vine-ripened heirlooms picked the morning of shipment. Rich, complex flavor — nothing like supermarket tomatoes.",
  },
  {
    id: "honeycrisp-apples",
    name: "Honeycrisp Apples",
    variety: "First-pick, premium grade",
    farmId: "sunrise-orchards",
    category: "fruits",
    price: 3.25,
    unit: "lb",
    image: fruitStand,
    delivery: "48h",
    organic: true,
    rating: 4.8,
    reviews: 132,
    stock: 180,
    freshnessGrade: "A",
    freshnessScore: 9.7,
    description:
      "Crisp, sweet-tart Honeycrisps with that signature snap. Cold-stored under controlled atmosphere for peak texture.",
  },
  {
    id: "creamline-milk",
    name: "Creamline Whole Milk",
    variety: "Glass bottle, half gallon",
    farmId: "morning-glory",
    category: "dairy-eggs",
    price: 7.25,
    unit: "half gal",
    image: dairyEggs,
    delivery: "24h",
    rating: 4.9,
    reviews: 211,
    stock: 36,
    freshnessGrade: "A",
    freshnessScore: 9.8,
    description:
      "Non-homogenized, low-temp pasteurized milk from grass-fed Jerseys. Shake before pouring — the cream rises naturally.",
  },
  {
    id: "wildflower-honey",
    name: "Raw Wildflower Honey",
    variety: "16 oz jar",
    farmId: "golden-meadow",
    category: "honey-preserves",
    price: 14,
    unit: "jar",
    image: honeyJars,
    delivery: "48h",
    rating: 4.9,
    reviews: 76,
    stock: 52,
    freshnessGrade: "A",
    freshnessScore: 9.6,
    description:
      "Single-origin wildflower honey from Gallatin Valley hives. Unfiltered and never heat-processed.",
  },
  {
    id: "grass-fed-ribeye",
    name: "Grass-Fed Ribeye Steak",
    variety: "14 oz, dry-aged 21 days",
    farmId: "homestead-hollow",
    category: "meat-poultry",
    price: 28,
    unit: "steak",
    image: farmerPortrait,
    delivery: "24h",
    rating: 4.9,
    reviews: 94,
    stock: 18,
    freshnessGrade: "A",
    freshnessScore: 9.5,
    description:
      "100% grass-fed, dry-aged ribeye from cattle raised on Texas Hill Country pasture. Vacuum sealed, flash-chilled.",
  },
  {
    id: "salad-mix",
    name: "Spring Salad Mix",
    variety: "Bagged 8 oz, harvested today",
    farmId: "blue-ridge",
    category: "vegetables",
    price: 6,
    unit: "bag",
    image: produceCrate,
    delivery: "24h",
    organic: true,
    rating: 4.8,
    reviews: 168,
    stock: 42,
    freshnessGrade: "A",
    freshnessScore: 9.3,
    description:
      "A fresh blend of baby lettuces, arugula, mizuna, and edible flowers. Hand-cut and washed within hours of shipment.",
  },
  {
    id: "pasture-eggs",
    name: "Pasture-Raised Eggs",
    variety: "Dozen, mixed brown",
    farmId: "blue-ridge",
    category: "dairy-eggs",
    price: 8.5,
    unit: "dozen",
    image: dairyEggs,
    delivery: "24h",
    rating: 4.9,
    reviews: 245,
    stock: 60,
    freshnessGrade: "A",
    freshnessScore: 9.7,
    description:
      "Eggs from hens that roam 5 acres of fresh pasture daily. Deep orange yolks, sturdy shells, unbeatable flavor.",
  },
  {
    id: "peach-preserves",
    name: "Small-Batch Peach Preserves",
    variety: "8 oz jar",
    farmId: "sunrise-orchards",
    category: "honey-preserves",
    price: 11,
    unit: "jar",
    image: honeyJars,
    delivery: "48h",
    rating: 4.7,
    reviews: 58,
    stock: 28,
    freshnessGrade: "A",
    freshnessScore: 9.2,
    description:
      "Cooked in small copper kettles with our own orchard peaches and cane sugar. No pectin, no preservatives.",
  },
];

export const buyerTestimonials = [
  {
    name: "Sarah K.",
    location: "Charlotte, NC",
    rating: 5,
    quote:
      "The tomatoes from Blue Ridge tasted like the ones my grandma grew. I'll never go back to grocery store produce.",
  },
  {
    name: "Marcus T.",
    location: "Madison, WI",
    rating: 5,
    quote:
      "Knowing my milk came from cows on pasture 30 miles away — that's the kind of food I want to feed my family.",
  },
  {
    name: "Priya R.",
    location: "Austin, TX",
    rating: 5,
    quote:
      "Escrow checkout was reassuring. Order arrived perfectly packed and I confirmed delivery in 10 seconds. Smooth.",
  },
];

export const farmerTestimonials = [
  {
    name: "Tom Wagner",
    farm: "River Bend Produce, PA",
    rating: 5,
    quote:
      "Last season I sold 60% of my harvest through DiGiFaMaR. Kept 88% of every dollar. Wholesale buyers were taking 45%.",
  },
  {
    name: "Elena Vasquez",
    farm: "Homestead Hollow, TX",
    rating: 5,
    quote:
      "Same-day payouts changed our cash flow. I qualified for a $40k equipment loan after my first 30 sales here.",
  },
  {
    name: "Daniel Yoder",
    farm: "Morning Glory Dairy, WI",
    rating: 5,
    quote:
      "I list a product in three minutes and customers find me from three states away. This is what farming should look like.",
  },
];

export const certifications = [
  "USDA Organic",
  "Non-GMO",
  "Pasture-Raised",
  "Free-Range",
  "Grass-Fed",
];

export function getFarm(id: string) {
  return farms.find((f) => f.id === id);
}
export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}
export function getProductsByFarm(farmId: string) {
  return products.filter((p) => p.farmId === farmId);
}
