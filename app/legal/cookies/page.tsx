// app/legal/cookies/page.tsx
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function CookiesPage() {
  return (
    <LegalPageLayout title="Cookie Policy" lastUpdated="Draft — not yet published">
      <h2>1. What cookies we use</h2>
      <ul>
        <li>
          <strong>Essential:</strong> session/auth cookies that keep you logged in — the site
          doesn't function without these.
        </li>
        <li>
          <strong>Preference:</strong> remembers your light/dark mode choice.
        </li>
      </ul>

      <h2>2. What we don't do</h2>
      <p>
        We don't use third-party advertising or tracking cookies.
      </p>

      <h2>3. Managing cookies</h2>
      <p>
        You can clear or block cookies through your browser settings. Blocking essential
        cookies will prevent you from staying logged in.
      </p>
    </LegalPageLayout>
  );
}
