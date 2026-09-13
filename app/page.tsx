// app/page.tsx
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/marketing/Hero";
import { PopularServices } from "@/components/marketing/PopularServices";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { TrustMetrics } from "@/components/marketing/TrustMetrics";
import { WhyChooseUs } from "@/components/marketing/WhyChooseUs";
import { Testimonials } from "@/components/marketing/Testimonials";
import { CtaBanner } from "@/components/marketing/CtaBanner";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <PopularServices />
        <HowItWorks />
        <TrustMetrics />
        <WhyChooseUs />
        <Testimonials />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
