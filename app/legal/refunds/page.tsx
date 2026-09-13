// app/legal/refunds/page.tsx
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function RefundsPage() {
  return (
    <LegalPageLayout title="Refund Policy" lastUpdated="Draft — not yet published">
      <h2>1. Before activation</h2>
      <p>
        If your payment is confirmed but access hasn't been activated yet, you can request a
        full refund by opening a support ticket.
      </p>

      <h2>2. After activation</h2>
      <p>
        Once access has been activated, subscriptions are generally non-refundable, since the
        service has been delivered. If access fails to work as expected, contact support first
        — we'll fix it or issue a refund if we can't.
      </p>

      <h2>3. Failed or duplicate payments</h2>
      <p>
        If you were charged in error or charged twice for the same order, we'll refund the
        duplicate or incorrect charge once verified.
      </p>

      <h2>4. How refunds are issued</h2>
      <p>
        Approved refunds are returned to your original payment method through our payment
        provider. Processing time depends on your bank or card issuer.
      </p>

      <h2>5. Requesting a refund</h2>
      <p>
        Open a support ticket from your dashboard with your order ID and the reason for the
        request.
      </p>
    </LegalPageLayout>
  );
}
