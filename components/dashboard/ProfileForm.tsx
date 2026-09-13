// components/dashboard/ProfileForm.tsx
"use client";

import { useFormState } from "react-dom";
import { updateProfileAction, type ProfileActionState } from "@/app/dashboard/profile/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/auth/SubmitButton";

const initialState: ProfileActionState = {};

export function ProfileForm({
  profile,
}: {
  profile: { full_name: string; email: string; phone: string | null; country: string | null };
}) {
  const [state, formAction] = useFormState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-text-primary">Email</label>
        <Input value={profile.email} disabled className="mt-1.5 opacity-60" />
        <p className="mt-1 text-xs text-text-secondary">Email can't be changed here.</p>
      </div>

      <div>
        <label htmlFor="fullName" className="text-sm font-medium text-text-primary">
          Full name
        </label>
        <Input id="fullName" name="fullName" defaultValue={profile.full_name} required className="mt-1.5" />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-medium text-text-primary">
          Phone
        </label>
        <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} className="mt-1.5" />
      </div>

      <div>
        <label htmlFor="country" className="text-sm font-medium text-text-primary">
          Country
        </label>
        <Input id="country" name="country" defaultValue={profile.country ?? ""} className="mt-1.5" />
      </div>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
      )}

      <SubmitButton>Save Changes</SubmitButton>
    </form>
  );
}
