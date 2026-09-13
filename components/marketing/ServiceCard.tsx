// components/marketing/ServiceCard.tsx
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { AvailabilityBadge, availabilityFromCapacity } from "@/components/ui/AvailabilityBadge";

export interface ServiceCardData {
  slug: string;
  name: string;
  description: string;
  logoUrl?: string;
  price: number;
  currency: string;
  billingPeriod: string; // e.g. "month"
  availableCapacity: number;
  totalCapacity: number;
}

export function ServiceCard({ service }: { service: ServiceCardData }) {
  const availability = availabilityFromCapacity(
    service.availableCapacity,
    service.totalCapacity
  );
  const isUnavailable = availability === "unavailable";

  return (
    <Card className="flex flex-col p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-secondary">
        {service.logoUrl ? (
          <Image
            src={service.logoUrl}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="h-7 w-7 object-contain"
          />
        ) : (
          <span className="font-heading text-lg font-bold text-brand-primary">
            {service.name.charAt(0)}
          </span>
        )}
      </div>

      <h3 className="mt-4 font-heading text-base font-bold text-text-primary">{service.name}</h3>
      <p className="mt-1 text-sm text-text-secondary">{service.description}</p>

      <p className="mt-3 text-lg font-bold text-text-primary">
        {formatCurrency(service.price, service.currency)}
        <span className="text-sm font-normal text-text-secondary">
          {" "}
          / {service.billingPeriod}
        </span>
      </p>

      <div className="mt-2 flex items-center justify-between">
        <AvailabilityBadge state={availability} />
        {!isUnavailable && (
          <span className="text-xs text-text-secondary">
            {service.availableCapacity} spot{service.availableCapacity === 1 ? "" : "s"} left
          </span>
        )}
      </div>

      {isUnavailable ? (
        <Link
          href={`/services/${service.slug}?waitlist=1`}
          className="mt-4 rounded-button border border-border px-4 py-2.5 text-center text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary"
        >
          Notify Me When Available
        </Link>
      ) : (
        <ButtonLink href={`/services/${service.slug}`} className="mt-4 w-full">
          Get Access
        </ButtonLink>
      )}
    </Card>
  );
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
