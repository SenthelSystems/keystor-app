"use client";

import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export default function Button({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "secondary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed";

  const variants: Record<Variant, string> = {
    primary:
      "border-[#2A3566] bg-[#1A2346] text-zinc-100 hover:bg-[#12182A] hover:border-[#3A4A8A]",
    secondary:
      "border-[#232838] bg-[#0F1115] text-zinc-200 hover:bg-[#12182A]",
    ghost:
      "border-transparent bg-transparent text-zinc-300 hover:bg-[#12182A] hover:text-zinc-100",
    danger:
      "border-red-900/40 bg-red-950/30 text-red-200 hover:bg-red-950/50",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
