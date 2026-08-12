/**
 * schema.org structured data builders for marketplace pages.
 *
 * Only facts that exist in the catalog are emitted — ratings come from the
 * listing's own rating/review count, never invented review bodies.
 */
import { SITE_ORIGIN } from "@/lib/brand";
import type { Farm, Product } from "@/lib/mock-data";

export const siteUrl = (path: string) => `${SITE_ORIGIN}${path}`;

type Json = Record<string, unknown>;

const aggregateRating = (rating: number, reviews: number): Json | undefined =>
  reviews > 0
    ? {
        "@type": "AggregateRating",
        ratingValue: rating,
        reviewCount: reviews,
        bestRating: 5,
        worstRating: 1,
      }
    : undefined;

/** Product schema for a listing page, including offer + aggregate rating. */
export function productJsonLd(product: Product, farm: Farm | undefined, image: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": siteUrl(`/product/${product.id}`) + "#product",
    name: product.name,
    description: product.description,
    image: [image],
    sku: product.id,
    category: product.category,
    ...(product.variety ? { model: product.variety } : {}),
    ...(farm
      ? {
          brand: { "@type": "Brand", name: farm.name },
          manufacturer: {
            "@type": "Organization",
            name: farm.name,
            url: siteUrl(`/farm/${farm.id}`),
          },
        }
      : {}),
    aggregateRating: aggregateRating(product.rating, product.reviews),
    offers: {
      "@type": "Offer",
      url: siteUrl(`/product/${product.id}`),
      price: product.price.toFixed(2),
      priceCurrency: "USD",
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      eligibleQuantity: { "@type": "QuantitativeValue", unitText: product.unit },
      ...(farm ? { seller: { "@type": "Organization", name: farm.name } } : {}),
    },
  };
}

/** LocalBusiness (Farm) schema for a farm profile page. */
export function farmJsonLd(farm: Farm, image: string, farmProducts: Product[]): Json {
  const [city, state] = farm.location.split(",").map((s) => s.trim());
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Farm"],
    "@id": siteUrl(`/farm/${farm.id}`) + "#farm",
    name: farm.name,
    description: farm.description,
    image: [image],
    url: siteUrl(`/farm/${farm.id}`),
    foundingDate: String(farm.established),
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressRegion: state ?? farm.state,
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: farm.lat, longitude: farm.lng },
    aggregateRating: aggregateRating(farm.rating, farm.reviews),
    ...(farm.certifications.length
      ? { knowsAbout: farm.certifications, award: farm.certifications }
      : {}),
    ...(farmProducts.length
      ? {
          makesOffer: farmProducts.map((p) => ({
            "@type": "Offer",
            price: p.price.toFixed(2),
            priceCurrency: "USD",
            url: siteUrl(`/product/${p.id}`),
            itemOffered: { "@type": "Product", name: p.name },
          })),
        }
      : {}),
  };
}

/** Breadcrumbs for deep marketplace routes. */
export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: siteUrl(t.path),
    })),
  };
}

/** ItemList for the marketplace index. */
export function itemListJsonLd(products: Product[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "DiGiFaMaR Marketplace listings",
    numberOfItems: products.length,
    itemListElement: products.slice(0, 30).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: siteUrl(`/product/${p.id}`),
      name: p.name,
    })),
  };
}
