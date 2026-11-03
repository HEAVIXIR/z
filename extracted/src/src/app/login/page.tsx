import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0b0b] px-4"
    >
      {/* Background glows */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(245,130,32,0.12),transparent_70%)]" />
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/logos/heavix-logo.svg"
            alt="HEAVIX"
            className="h-14 w-auto"
          />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-white/40">
            HEAVIX Portal
          </p>
        </div>

        <LoginForm />

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs font-medium text-white/40 transition hover:text-[#F58220]"
          >
            ← بازگشت به سایت
          </a>
        </div>
      </div>
    </div>
  );
}
