import { Suspense } from "react";
import SignupClient from "./signup-client";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0B0E14] text-zinc-100">
          <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
            <div className="rounded-2xl border border-[#232838] bg-[#121726] px-6 py-4 text-sm text-zinc-300">
              Loading signup…
            </div>
          </div>
        </main>
      }
    >
      <SignupClient />
    </Suspense>
  );
}