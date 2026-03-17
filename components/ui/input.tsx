"use client";

import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={[
          "w-full rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-zinc-100 outline-none transition",
          "placeholder:text-zinc-500 focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60",
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;