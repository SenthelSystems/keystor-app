"use client";

import { useState } from "react";
import SupportTicketModal from "@/components/modals/support-ticket-modal";
import Button from "@/components/ui/button";

export default function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Contact Support
      </Button>

      <SupportTicketModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
