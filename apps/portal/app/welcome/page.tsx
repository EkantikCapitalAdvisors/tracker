import { Suspense } from 'react';
import { WelcomeForm } from '@/components/WelcomeForm';

export const metadata = {
  title: 'Welcome — Ekantik Research Portal',
};

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
      <div className="rounded-lg border border-navy/15 bg-navy p-8 text-ivory">
        <p className="text-xs uppercase tracking-widest text-gold">
          Ekantik Capital Advisors — Correction Intelligence Program
        </p>
        <h1 className="mt-2 text-3xl">Ekantik Research Portal</h1>
        <p className="mt-2 font-heading text-lg text-ivory/90">
          Measure the seller, not the headline.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ivory/75">
          This research portal is shared personally, not published broadly. Tell us who you are and
          you&rsquo;re in — no password, no verification email, and your details are used for one
          purpose only: so Ekantik knows who its research has been shared with.
        </p>

        <Suspense>
          <WelcomeForm />
        </Suspense>

        <p className="mt-5 border-t border-ivory/15 pt-4 text-xs leading-relaxed text-ivory/50">
          General-circulation research under the publisher&rsquo;s exemption — not personalized
          investment advice. By continuing you acknowledge the disclosures in the Investor Manual.
        </p>
      </div>
      <p className="mt-4 text-center font-heading text-sm text-navy/60">
        Your Wealth. Our Accountability. Total Transparency.
      </p>
    </main>
  );
}
