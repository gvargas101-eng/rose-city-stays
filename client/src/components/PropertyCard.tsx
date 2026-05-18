// Rose City Stays — PropertyCard
// Design: Rose City Luxe — clean card with hover lift, mauve rating badge

import { Link } from "wouter";
import { Star, Users, BedDouble, Bath } from "lucide-react";
import type { Property } from "@/lib/properties";

interface PropertyCardProps {
  property: Property;
  index?: number;
}

export default function PropertyCard({ property, index = 0 }: PropertyCardProps) {
  const delayClass = `animate-delay-${Math.min((index % 4) * 100 + 100, 400)}`;

  return (
    <Link href={`/property/${property.id}`}>
      <div
        className={`group property-card bg-card rounded-lg overflow-hidden border border-border animate-fade-in-up ${delayClass} cursor-pointer`}
        style={{ opacity: 0 }}
      >
        {/* Image */}
        <div className="relative overflow-hidden aspect-[4/3]">
          <img
            src={property.image}
            alt={property.shortName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Rating badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-body)" }}>
              {(Number(property.rating) || 5.0).toFixed(2)}
            </span>
          </div>
          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className="badge-mauve text-[10px]">{property.type}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3
            className="text-xl font-medium text-foreground mb-1 leading-tight group-hover:text-primary transition-colors"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {property.shortName}
          </h3>
          <p className="text-xs text-muted-foreground mb-3 tracking-wide" style={{ fontFamily: "var(--font-body)" }}>
            {property.neighborhood} · Tyler, TX
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {property.guests}
            </span>
            <span className="flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5" />
              {property.bedrooms} BR
            </span>
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" />
              {property.bathrooms} BA
            </span>
          </div>

          {/* Amenity pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {property.amenities.slice(0, 3).map((amenity) => (
              <span
                key={amenity}
                className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {amenity}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              {property.reviewCount} reviews
            </span>
            <span
              className="text-sm font-medium text-primary group-hover:underline"
              style={{ fontFamily: "var(--font-body)" }}
            >
              View Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
