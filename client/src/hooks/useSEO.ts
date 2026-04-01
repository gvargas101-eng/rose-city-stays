// useSEO hook for managing SEO meta tags and schema markup
// Automatically updates meta tags when component mounts

import { useEffect } from "react";
import { setSEOMeta, injectSchema, SEOConfig } from "@/lib/seo";

export const useSEO = (config: SEOConfig, schema?: Record<string, unknown>) => {
  useEffect(() => {
    // Set meta tags
    setSEOMeta(config);

    // Inject schema markup if provided
    if (schema) {
      injectSchema(schema);
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }, [config, schema]);
};
