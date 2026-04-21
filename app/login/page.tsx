// app/login/page.tsx
import { signIn } from "@/auth";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-indigo-500" />
          <span className="text-xl font-bold text-slate-900">SaaSGuard</span>
        </div>

        <h1 className="text-lg font-semibold text-slate-900 mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">
          Use your company account to continue.
        </p>

        {params.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Access denied. Make sure you&apos;re using your company email.
          </div>
        )}

        <div className="flex flex-col gap-3">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" variant="outline" className="w-full">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("okta", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" variant="outline" className="w-full">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#00297A">
                <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
              </svg>
              Sign in with Okta
            </Button>
          </form>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">or</span>
            </div>
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("credentials", {
                email: formData.get("email") as string,
                password: formData.get("password") as string,
                redirectTo: "/dashboard",
              });
            }}
            className="flex flex-col gap-2"
          >
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              required
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button type="submit" className="w-full">
              Sign in with Email
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
