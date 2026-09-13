// app/checkout/callback/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/brand/Logo";

type PollStatus = "checking" | "confirmed" | "failed" | "timeout";

export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell><Spinner /></CallbackShell>}>
      <CheckoutCallbackContent />
    </Suspense>
  );
}

function CallbackShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card className="mt-8 p-8">{children}</Card>
      </div>
    </div>
  );
}

function CheckoutCallbackContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [status, setStatus] = useState<PollStatus>("checking");

  useEffect(() => {
    if (!orderId) {
      setStatus("failed");
      return;
    }

    const supabase = createClient();
    let attempts = 0;
    const maxAttempts = 15; // ~30s at 2s intervals — webhook is usually near-instant

    const interval = setInterval(async () => {
      attempts += 1;

      const { data: order } = await supabase
        .from("orders")
        .select("payment_status")
        .eq("id", orderId)
        .single();

      if (order?.payment_status === "payment_confirmed") {
        clearInterval(interval);
        setStatus("confirmed");
      } else if (order?.payment_status === "failed") {
        clearInterval(interval);
        setStatus("failed");
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        setStatus("timeout");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <>
      {status === "checking" && (
        <>
          <Spinner />
          <h1 className="mt-4 font-heading text-lg font-bold text-text-primary">
            Confirming your payment…
          </h1>
          <p className="mt-1 text-sm text-text-secondary">This usually takes a few seconds.</p>
        </>
      )}

      {status === "confirmed" && (
        <>
          <CheckCircle />
          <h1 className="mt-4 font-heading text-lg font-bold text-text-primary">
            You're all set!
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your access is being activated now.
          </p>
          <Link
            href="/dashboard/services"
            className="mt-5 inline-flex rounded-button bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            Go to My Services
          </Link>
        </>
      )}

      {status === "failed" && (
        <>
          <h1 className="font-heading text-lg font-bold text-text-primary">Payment failed</h1>
          <p className="mt-1 text-sm text-text-secondary">
            We couldn't complete that action. Please try again.
          </p>
          <Link
            href="/services"
            className="mt-5 inline-flex rounded-button border border-brand-primary px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary"
          >
            Back to Services
          </Link>
        </>
      )}

      {status === "timeout" && (
        <>
          <h1 className="font-heading text-lg font-bold text-text-primary">
            Still confirming
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Payment verification is still in progress. Check your dashboard shortly — we'll
            also email you.
          </p>
          <Link
            href="/dashboard/services"
            className="mt-5 inline-flex rounded-button border border-brand-primary px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary"
          >
            Go to My Services
          </Link>
        </>
      )}
    </>
  );
}

function Spinner() {
  return (
    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
  );
}

function CheckCircle() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="mx-auto text-emerald-500"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
