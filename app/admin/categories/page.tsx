// app/admin/categories/page.tsx
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/Card";
import { CreateCategoryForm } from "@/components/admin/CreateCategoryForm";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function AdminCategoriesPage() {
  const client = getServiceClient();
  const { data: categories } = await client
    .from("service_categories")
    .select("id, name, slug, description, services(id)")
    .order("name");

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-text-primary">Categories</h1>
      <p className="mt-1 text-text-secondary">Organize the service catalog.</p>

      <CreateCategoryForm />

      <div className="mt-6 space-y-3">
        {(categories ?? []).map((category: any) => (
          <Card key={category.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-text-primary">{category.name}</p>
              <p className="text-xs text-text-secondary">
                /{category.slug} · {category.services?.length ?? 0} service(s)
              </p>
            </div>
          </Card>
        ))}
        {(!categories || categories.length === 0) && (
          <p className="text-center text-text-secondary">No categories yet.</p>
        )}
      </div>
    </div>
  );
}
