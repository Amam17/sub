// app/legal/privacy/page.tsx
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="Draft — not yet published">
      <h2>1. What we collect</h2>
      <ul>
        <li>Account information: name, email, phone (optional), country.</li>
        <li>Order and payment records (we don't store full card numbers — that's handled by our payment provider).</li>
        <li>Support ticket contents and communications with us.</li>
        <li>Basic usage data (e.g. which services you view or purchase) used to run the platform and show availability.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To create and manage your account and subscriptions.</li>
        <li>To process payments and deliver access to purchased services.</li>
        <li>To send transactional notifications (payment confirmations, renewal reminders, support replies).</li>
        <li>To detect fraud and keep the platform secure.</li>
      </ul>

      <h2>3. Who we share it with</h2>
      <p>
        We share the minimum necessary data with our payment provider (to process payments) and
        our email provider (to deliver notifications). We don't sell your personal data.
      </p>

      <h2>4. Data retention</h2>
      <p>
        We retain account and order data for as long as your account is active and as needed to
        meet legal and accounting obligations.
      </p>

      <h2>5. Your rights</h2>
      <p>
        You can request a copy of your data, ask us to correct it, or request deletion of your
        account, subject to what we're required to retain for legal or accounting reasons.
      </p>

      <h2>6. Security</h2>
      <p>
        We use industry-standard practices — encrypted connections, role-based access controls,
        and audit logging on sensitive actions — to protect your data.
      </p>

      <h2>7. Contact</h2>
      <p>Privacy questions or requests: support@subshare.com</p>
    </LegalPageLayout>
  );
}
