// SEO utilities for Rose City Stays
// Meta tags, schema markup, and optimization

export interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  keywords?: string[];
}

export const defaultSEO: SEOConfig = {
  title: "Rose City Stays | Luxury Short-Term Rentals in Tyler, TX",
  description:
    "Discover luxury vacation rentals and corporate housing in Tyler, Texas. Perfect for medical professionals, tourists, and business travelers. Book direct and save on platform fees.",
  ogImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
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
  // Set title
  document.title = config.title;

  // Set or update meta tags
  setMetaTag("description", config.description);
  setMetaTag("keywords", config.keywords?.join(", ") || "");
  setMetaTag("og:title", config.title);
  setMetaTag("og:description", config.description);
  setMetaTag("og:type", config.ogType || "website");

  if (config.ogImage) {
    setMetaTag("og:image", config.ogImage);
    setMetaTag("twitter:image", config.ogImage);
  }

  if (config.twitterCard) {
    setMetaTag("twitter:card", config.twitterCard);
  }

  // Set canonical URL
  if (config.canonical) {
    setCanonicalURL(config.canonical);
  }
};

const setMetaTag = (name: string, content: string) => {
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

// Schema.org structured data
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
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    url: article.url,
  };
};

export const generatePropertySchema = (property: {
  name: string;
  description: string;
  image: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  url: string;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: property.name,
    description: property.description,
    image: property.image,
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: "Tyler",
      addressRegion: "TX",
      postalCode: "75701",
      addressCountry: "US",
    },
    numberOfRooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    priceRange: `$${property.price}`,
    url: property.url,
  };
};

export const generateOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Rose City Stays",
    description: "Luxury vacation rentals and corporate housing in Tyler, Texas",
    url: "https://rosecitystays.com",
    telephone: "+1-903-XXX-XXXX",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Tyler",
      addressLocality: "Tyler",
      addressRegion: "TX",
      postalCode: "75701",
      addressCountry: "US",
    },
    sameAs: [
      "https://www.facebook.com/rosecitystays",
      "https://www.instagram.com/rosecitystays",
    ],
  };
};

export const injectSchema = (schema: Record<string, unknown>) => {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
};
