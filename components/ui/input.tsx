"use client";

import React from "react";

export default function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  className = "",
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-md border border-[#232838] bg-[#141821] px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60 ${className}`}
    />
  );
}
