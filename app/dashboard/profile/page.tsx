// app/dashboard/profile/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "@/components/dashboard/ProfileForm";

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, country, status, created_at")
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-lg">
      <h1 className="font-heading text-2xl font-bold text-text-primary">Profile</h1>
      <p className="mt-1 text-text-secondary">Manage your account details.</p>

      <Card className="mt-6 p-5">
        <ProfileForm profile={profile!} />
      </Card>

      <p className="mt-4 text-xs text-text-secondary">
        Member since {new Date(profile!.created_at).toLocaleDateString()} · Account status:{" "}
        {profile!.status}
      </p>
    </div>
  );
}
