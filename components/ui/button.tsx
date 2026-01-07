"use client";

import React from "react";

type Variant = "primary" | "secondary" | "danger";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export default function Button({
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed";

  const styles: Record<Variant, string> = {
    primary: "border-[#2A3566] bg-[#1A2346] text-zinc-100 hover:bg-[#1C2340]",
    secondary: "border-[#232838] bg-[#161C2F] text-zinc-200 hover:bg-[#1C2340]",
    danger: "border-red-900/40 bg-red-950/30 text-red-200 hover:bg-red-950/40",
  };

  return (
    <button
      type={type}
      className={[base, styles[variant], className].join(" ")}
      {...props}
    />
  );
}
