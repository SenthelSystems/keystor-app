export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F1115] text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
    </div>
  );
}
