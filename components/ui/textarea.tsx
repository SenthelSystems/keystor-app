"use client";

import React from "react";

export default function Textarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  disabled,
  className = "",
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-md border border-[#232838] bg-[#141821] px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60 ${className}`}
    />
  );
}
