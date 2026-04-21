// app/signup/page.tsx
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { Shield } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm shadow-sm text-center">
          <p className="text-slate-600">Invalid or missing invite link.</p>
        </div>
      </div>
    );
  }

  const invite = await db.invite.findUnique({
    where: { token },
    include: { team: true },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm shadow-sm text-center">
          <p className="text-slate-600">This invite link is expired or has already been used.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/login-bg.png')" }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-indigo-500" />
          <span className="text-xl font-bold text-slate-900">SaaSGuard</span>
        </div>

        <h1 className="text-lg font-semibold text-slate-900 mb-1">Create your account</h1>
        <p className="text-sm text-slate-500 mb-6">
          You&apos;ve been invited to join{invite.team ? ` the ${invite.team.name} team` : ""} as{" "}
          <span className="font-medium capitalize">{invite.role}</span>.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error === "password_mismatch"
              ? "Passwords do not match."
              : error === "email_taken"
              ? "An account with this email already exists."
              : "Something went wrong. Please try again."}
          </div>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            const name = (formData.get("name") as string)?.trim();
            const password = formData.get("password") as string;
            const confirm = formData.get("confirm") as string;

            if (password !== confirm) {
              redirect(`/signup?token=${token}&error=password_mismatch`);
            }

            const inv = await db.invite.findUnique({ where: { token } });
            if (!inv || inv.usedAt || inv.expiresAt < new Date()) {
              redirect(`/signup?token=${token}&error=expired`);
            }

            const existing = await db.user.findUnique({ where: { email: inv.email } });
            if (existing) {
              // If user exists but has no password, update them
              if (!existing.passwordHash) {
                const ph = await hashPassword(password);
                await db.user.update({
                  where: { id: existing.id },
                  data: {
                    name: name || existing.name,
                    passwordHash: ph,
                    role: inv.role,
                    teamId: inv.teamId ?? undefined,
                  },
                });
              } else {
                redirect(`/signup?token=${token}&error=email_taken`);
              }
            } else {
              const ph = await hashPassword(password);
              await db.user.create({
                data: {
                  email: inv.email,
                  name: name || inv.email.split("@")[0],
                  passwordHash: ph,
                  role: inv.role,
                  teamId: inv.teamId ?? undefined,
                },
              });
            }

            await db.invite.update({
              where: { id: inv.id },
              data: { usedAt: new Date() },
            });

            redirect("/login?signup=success");
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
            <input
              type="email"
              value={invite.email}
              disabled
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Full name</label>
            <input
              type="text"
              name="name"
              placeholder="Jane Smith"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Min. 8 characters"
              required
              minLength={8}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Confirm password</label>
            <input
              type="password"
              name="confirm"
              placeholder="Repeat password"
              required
              minLength={8}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit" className="w-full mt-1">
            Create account
          </Button>
        </form>
      </div>
    </div>
  );
}
