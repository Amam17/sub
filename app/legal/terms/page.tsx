// app/legal/terms/page.tsx
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="Draft — not yet published">
      <h2>1. Who we are</h2>
      <p>
        SubShare ("we", "us") operates a platform that helps customers discover, purchase, and
        activate access to eligible digital services.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must provide accurate information when creating an account and are responsible for
        keeping your login credentials secure. You must be legally able to enter into this
        agreement in your jurisdiction.
      </p>

      <h2>3. Services and access</h2>
      <p>
        Every service listed on SubShare is provided through an access model that reflects
        what is actually authorized by that service's provider — including, where applicable,
        a provider's own reseller or multi-seat program. We do not knowingly facilitate access
        that a provider's terms prohibit.
      </p>

      <h2>4. Payments and pricing</h2>
      <p>
        Prices are shown at checkout and confirmed before payment. Payments are processed
        through our third-party payment provider; we do not store your full card details.
      </p>

      <h2>5. Renewals and cancellation</h2>
      <p>
        Some subscriptions may auto-renew. You can cancel auto-renewal at any time from your
        dashboard; your access continues until the end of the period you've already paid for.
      </p>

      <h2>6. Availability</h2>
      <p>
        Capacity for a given service is limited and reflects real availability. We do not
        guarantee a spot will remain open between browsing and checkout.
      </p>

      <h2>7. Acceptable use</h2>
      <ul>
        <li>Don't attempt to circumvent capacity, security, or access controls.</li>
        <li>Don't resell or redistribute access obtained through SubShare.</li>
        <li>Don't use the platform for any unlawful purpose.</li>
      </ul>

      <h2>8. Termination</h2>
      <p>
        We may suspend or terminate accounts that violate these terms, engage in fraud, or
        abuse the platform.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        SubShare is provided "as is." To the extent permitted by law, we are not liable for
        indirect or consequential damages arising from your use of the platform.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>We may update these terms from time to time. Continued use after an update means you accept the revised terms.</p>

      <h2>11. Contact</h2>
      <p>Questions about these terms: support@subshare.com</p>
    </LegalPageLayout>
  );
}
