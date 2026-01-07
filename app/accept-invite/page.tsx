import { Suspense } from "react";
import AcceptInviteClient from "./accept-invite-client";

export const dynamic = "force-dynamic";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0E14] text-zinc-100 p-6">Loading…</div>}>
      <AcceptInviteClient />
    </Suspense>
  );
}
