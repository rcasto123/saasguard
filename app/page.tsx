import Link from "next/link";
import { Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/login-bg.png')" }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-10 h-10 text-indigo-400" />
          <span className="text-4xl font-bold text-white">SaaSGuard</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Gain Visibility into Your SaaS Usage
        </h1>
        <p className="text-lg text-slate-200 mb-8">
          Uncover shadow IT, track spend, and manage offboarding risk — all in one place.
        </p>
        <Link
          href="/login"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
