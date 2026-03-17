"use client";

import { useState } from "react";
import SupportTicketModal from "@/components/modals/support-ticket-modal";

export default function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-xl border border-[#2A3566] bg-[#1A2346] px-3 py-2 text-sm text-zinc-100 transition hover:bg-[#1C2340]"
      >
        Contact Support
      </button>

      <SupportTicketModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}