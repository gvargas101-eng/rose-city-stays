// SEO / AEO / GEO utilities for Rose City Stays
// Covers: meta tags, Open Graph, Twitter Cards, JSON-LD structured data, speakable, breadcrumbs

const SITE_URL = "https://www.rosecitystays.com";
const SITE_NAME = "Rose City Stays";
const DEFAULT_OG_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/hollytree-golf-photo-01_29d8f2c8.jpg";

export interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  keywords?: string[];
  path?: string; // e.g. "/property/the-briar" — used to build og:url and canonical
}

export const defaultSEO: SEOConfig = {
  title: "Rose City Stays | Luxury Short-Term Rentals in Tyler, TX",
  description:
    "Discover luxury vacation rentals and corporate housing in Tyler, Texas. Perfect for medical professionals, tourists, and business travelers. Book direct and save on platform fees.",
  ogImage: DEFAULT_OG_IMAGE,
  ogType: "website",
  keywords: [
    "vacation rentals Tyler TX",
    "corporate housing Tyler",
    "short-term rentals Tyler",
    "medical housing Tyler",
    "traveling nurse housing",
    "Rose City Stays",
  ],
};

export const setSEOMeta = (config: SEOConfig) => {
  // Title
  document.title = config.title;

  // Standard meta
  setMetaTag("description", config.description);
  setMetaTag("keywords", config.keywords?.join(", ") || "");

  // Open Graph
  setMetaTag("og:title", config.title);
  setMetaTag("og:description", config.description);
  setMetaTag("og:type", config.ogType || "website");
  setMetaTag("og:site_name", SITE_NAME);
  setMetaTag("og:locale", "en_US");

  const resolvedImage = config.ogImage || DEFAULT_OG_IMAGE;
  setMetaTag("og:image", resolvedImage);
  setMetaTag("og:image:width", "1200");
  setMetaTag("og:image:height", "630");
  setMetaTag("og:image:alt", config.title);

  const resolvedUrl = config.path ? `${SITE_URL}${config.path}` : config.canonical || SITE_URL;
  setMetaTag("og:url", resolvedUrl);

  // Twitter / X Cards
  setMetaTag("twitter:card", config.twitterCard || "summary_large_image");
  setMetaTag("twitter:site", "@rosecitystays");
  setMetaTag("twitter:title", config.title);
  setMetaTag("twitter:description", config.description);
  setMetaTag("twitter:image", resolvedImage);

  // Canonical
  if (config.canonical || config.path) {
    setCanonicalURL(config.canonical || resolvedUrl);
  }
};

const setMetaTag = (name: string, content: string) => {
  if (!content) return;
  let element = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    if (name.startsWith("og:") || name.startsWith("twitter:")) {
      element.setAttribute("property", name);
    } else {
      element.setAttribute("name", name);
    }
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const setCanonicalURL = (url: string) => {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);
};

// ─── JSON-LD Schema Generators ───────────────────────────────────────────────

/** Organization / LocalBusiness — inject once on the homepage */
export const generateOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": ["LodgingBusiness", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    description:
      "Rose City Stays offers luxury short-term and corporate vacation rentals in Tyler, Texas. 11 designer properties, 4.9-star rated, self check-in, 1 Gig WiFi.",
    url: SITE_URL,
    telephone: "+19037144305",
    email: "hello@rosecitystays.com",
    logo: {
      "@type": "ImageObject",
      url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/favicon-rc-bMVLL25jFj5tvpw9ijWyzd.png",
    },
    image: DEFAULT_OG_IMAGE,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tyler",
      addressRegion: "TX",
      postalCode: "75701",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 32.3513,
      longitude: -95.3011,
    },
    areaServed: {
      "@type": "City",
      name: "Tyler",
      sameAs: "https://en.wikipedia.org/wiki/Tyler,_Texas",
    },
    priceRange: "$$",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "200",
      bestRating: "5",
      worstRating: "1",
    },
    sameAs: [
      "https://www.instagram.com/rosecitystays",
      "https://www.facebook.com/rosecitystays",
      "https://www.airbnb.com/users/show/127000",
    ],
  };
};

/** FAQPage schema — for the homepage "Why Book Direct" section */
export const generateFAQSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Why should I book directly with Rose City Stays instead of Airbnb or VRBO?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Booking directly saves you the 10–15% service fees charged by Airbnb and VRBO. You also get direct communication with your host, flexible arrangements for extended stays, and the same 4.9-star quality you'd find on any platform.",
        },
      },
      {
        "@type": "Question",
        name: "Where are Rose City Stays properties located?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "All 11 Rose City Stays properties are located in Tyler, Texas — the Rose Capital of America. Properties are in neighborhoods like Hollytree, East Tyler, and near the Hospital District, steps from UT Health, Mother Frances Hospital, and downtown dining.",
        },
      },
      {
        "@type": "Question",
        name: "Does Rose City Stays offer corporate or extended-stay housing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Rose City Stays specializes in corporate housing and extended stays for traveling nurses, medical professionals, and business travelers. All properties include 1 Gig WiFi, full kitchens, and flexible check-in.",
        },
      },
      {
        "@type": "Question",
        name: "What is the check-in process at Rose City Stays?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "All Rose City Stays properties offer self check-in available 24 hours a day, 7 days a week. You'll receive access instructions before your arrival.",
        },
      },
      {
        "@type": "Question",
        name: "Are Rose City Stays properties pet-friendly?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Some Rose City Stays properties are pet-friendly. You can filter by 'Pets OK' on the properties page to find pet-friendly options.",
        },
      },
    ],
  };
};

/** Speakable schema — marks key content for voice assistants and AI (GEO) */
export const generateSpeakableSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: "Rose City Stays — Luxury Short-Term Rentals in Tyler, TX",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", ".speakable"],
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
      ],
    },
  };
};

/** LodgingBusiness schema for individual property pages */
export const generatePropertySchema = (property: {
  name: string;
  description: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  price?: number;
  rating?: number;
  reviewCount?: number;
  slug: string;
  amenities?: string[];
}) => {
  const url = `${SITE_URL}/property/${property.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${url}#lodging`,
    name: property.name,
    description: property.description,
    image: property.image,
    url,
    telephone: "+19037144305",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tyler",
      addressRegion: "TX",
      postalCode: "75701",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 32.3513,
      longitude: -95.3011,
    },
    numberOfRooms: property.bedrooms,
    amenityFeature: (property.amenities ?? []).map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a,
      value: true,
    })),
    ...(property.rating && property.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: property.rating.toFixed(1),
            reviewCount: property.reviewCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
    ...(property.price
      ? {
          priceRange: `From $${property.price}/night`,
        }
      : {}),
  };
};

/** BreadcrumbList schema */
export const generateBreadcrumbSchema = (
  crumbs: { name: string; path: string }[]
) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
};

/** BlogPosting schema */
export const generateArticleSchema = (article: {
  title: string;
  description: string;
  image: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  url: string;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    image: article.image,
    author: {
      "@type": "Organization",
      name: article.author,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/favicon-rc-bMVLL25jFj5tvpw9ijWyzd.png",
      },
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    url: article.url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.url,
    },
  };
};

/** Inject a JSON-LD script tag into <head> */
export const injectSchema = (schema: Record<string, unknown>) => {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
};
