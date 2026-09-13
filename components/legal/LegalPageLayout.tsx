// components/legal/LegalPageLayout.tsx
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-heading text-3xl font-extrabold text-text-primary">{title}</h1>
        <p className="mt-1 text-sm text-text-secondary">Last updated: {lastUpdated}</p>

        <div className="mt-4 rounded-card border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-text-secondary">
          This is a draft template, not finished legal copy. Have it reviewed by a lawyer
          familiar with Nigerian consumer and data protection law (and any other jurisdiction
          you operate in) before publishing.
        </div>

        <div className="prose prose-sm mt-8 max-w-none text-text-primary [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-3 [&_p]:text-text-secondary [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_li]:text-text-secondary">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
