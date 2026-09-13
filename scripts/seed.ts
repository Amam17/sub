// scripts/seed.ts
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed.ts
//
// Creates a handful of sample categories/services/plans/pools so
// local development has something real to browse, price, and
// check out against — safe to re-run (uses upsert on slug/unique
// fields where possible, skips services that already exist).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CATEGORIES = [
  { name: "Entertainment", slug: "entertainment" },
  { name: "Music", slug: "music" },
  { name: "AI Tools", slug: "ai-tools" },
  { name: "Productivity", slug: "productivity" },
];

interface SeedService {
  name: string;
  slug: string;
  description: string;
  categorySlug: string;
  accessDeliveryType: string;
  plan: { name: string; price: number; billingPeriod: string; durationDays: number };
  poolCapacity: number;
}

const SERVICES: SeedService[] = [
  {
    name: "Netflix Premium",
    slug: "netflix-premium",
    description: "Movies. Series. More.",
    categorySlug: "entertainment",
    accessDeliveryType: "manual_delivery",
    plan: { name: "Monthly", price: 2500, billingPeriod: "month", durationDays: 30 },
    poolCapacity: 4,
  },
  {
    name: "Spotify Premium",
    slug: "spotify-premium",
    description: "Music without limits.",
    categorySlug: "music",
    accessDeliveryType: "seat_invitation",
    plan: { name: "Monthly", price: 1800, billingPeriod: "month", durationDays: 30 },
    poolCapacity: 6,
  },
  {
    name: "ChatGPT Plus",
    slug: "chatgpt-plus",
    description: "Smarter. Faster.",
    categorySlug: "ai-tools",
    accessDeliveryType: "existing_account",
    plan: { name: "Monthly", price: 5000, billingPeriod: "month", durationDays: 30 },
    poolCapacity: 3,
  },
];

async function seed() {
  console.log("Seeding categories...");
  const categoryIdBySlug = new Map<string, string>();

  for (const category of CATEGORIES) {
    const { data: existing } = await client
      .from("service_categories")
      .select("id")
      .eq("slug", category.slug)
      .maybeSingle();

    if (existing) {
      categoryIdBySlug.set(category.slug, existing.id);
      continue;
    }

    const { data, error } = await client
      .from("service_categories")
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    categoryIdBySlug.set(category.slug, data.id);
  }

  console.log("Seeding services, plans, and pools...");
  for (const service of SERVICES) {
    const { data: existingService } = await client
      .from("services")
      .select("id")
      .eq("slug", service.slug)
      .maybeSingle();

    if (existingService) {
      console.log(`  - ${service.name} already exists, skipping.`);
      continue;
    }

    const { data: createdService, error: serviceError } = await client
      .from("services")
      .insert({
        name: service.name,
        slug: service.slug,
        description: service.description,
        category_id: categoryIdBySlug.get(service.categorySlug),
        status: "active",
        access_delivery_type: service.accessDeliveryType,
        pool_required: true,
      })
      .select()
      .single();

    if (serviceError) throw serviceError;

    const { error: planError } = await client.from("plans").insert({
      service_id: createdService.id,
      name: service.plan.name,
      price: service.plan.price,
      currency: "NGN",
      billing_period: service.plan.billingPeriod,
      duration_days: service.plan.durationDays,
      status: "active",
    });
    if (planError) throw planError;

    const { error: poolError } = await client.from("pools").insert({
      service_id: createdService.id,
      pool_number: 1,
      name: "Pool 1",
      status: "active",
      total_capacity: service.poolCapacity,
    });
    if (poolError) throw poolError;

    console.log(`  + Created ${service.name} with a ${service.poolCapacity}-seat pool.`);
  }

  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
