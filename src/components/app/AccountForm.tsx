"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { changePassword, updateProfileName } from "@/app/(app)/actions";
import { signOut } from "@/app/(auth)/actions";

const field =
  "w-full rounded-[12px] bg-surface-2 border border-hairline px-3 h-11 text-[15px] text-ink outline-none focus:border-accent";

export function AccountForm({
  name,
  email,
  role,
  isPro = false,
  billingLive = false,
}: {
  name: string;
  email: string;
  role: "student" | "tutor" | "admin";
  isPro?: boolean;
  billingLive?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [billingErr, setBillingErr] = useState<string | null>(null);

  function openBilling() {
    setBillingErr(null);
    start(async () => {
      const { startBillingPortal } = await import("@/app/checkout/actions");
      const res = await startBillingPortal();
      if (res.url) window.location.href = res.url;
      else setBillingErr(res.error ?? "Couldn't open billing.");
    });
  }

  const [fullName, setFullName] = useState(name);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  function saveName() {
    setNameMsg(null);
    setNameErr(null);
    start(async () => {
      const res = await updateProfileName(fullName);
      if (res.error) setNameErr(res.error);
      else {
        setNameMsg("Saved");
        router.refresh();
      }
    });
  }

  function savePassword() {
    setPwMsg(null);
    setPwErr(null);
    start(async () => {
      const res = await changePassword(pw);
      if (res.error) setPwErr(res.error);
      else {
        setPwMsg("Password updated");
        setPw("");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-ink">Profile</h2>
          <Badge tone="neutral" className="ml-auto capitalize">
            {role}
          </Badge>
        </div>

        <label className="block text-sm text-ink-2 mb-1.5">Name</label>
        <div className="flex gap-2">
          <input
            className={field}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
          <Button
            onClick={saveName}
            disabled={pending || !fullName.trim() || fullName.trim() === name}
          >
            <Check size={16} /> Save
          </Button>
        </div>
        {nameErr && <p className="text-sm text-danger mt-1.5">{nameErr}</p>}
        {nameMsg && <p className="text-sm text-accent mt-1.5">{nameMsg}</p>}

        <label className="block text-sm text-ink-2 mb-1.5 mt-4">Email</label>
        <div className="flex items-center gap-2 rounded-[12px] bg-surface-2 border border-hairline px-3 h-11 text-ink-2">
          <Mail size={16} className="text-ink-3" />
          <span className="truncate">{email}</span>
        </div>
        <p className="text-xs text-ink-3 mt-1.5">
          Email changes aren&apos;t self-serve yet — contact support to update it.
        </p>
      </Card>

      {/* Password */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-ink">Password</h2>
        </div>
        <div className="flex gap-2">
          <input
            className={field}
            type="password"
            placeholder="New password (min 8 characters)"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
          />
          <Button onClick={savePassword} disabled={pending || pw.length < 8}>
            Update
          </Button>
        </div>
        {pwErr && <p className="text-sm text-danger mt-1.5">{pwErr}</p>}
        {pwMsg && <p className="text-sm text-accent mt-1.5">{pwMsg}</p>}

        <div className="flex items-center gap-2 mt-4 text-sm text-ink-3">
          <ShieldCheck size={15} />
          Two-factor authentication is coming soon.
        </div>
      </Card>

      {/* Plan */}
      {role === "student" && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              <h2 className="text-lg font-semibold text-ink">Plan</h2>
              {isPro && <Badge tone="accent">Pro</Badge>}
            </div>
            {isPro && billingLive ? (
              <Button variant="secondary" size="sm" onClick={openBilling} disabled={pending}>
                Manage billing
              </Button>
            ) : !isPro ? (
              <Link href="/pricing">
                <Button variant="secondary" size="sm">
                  Upgrade
                </Button>
              </Link>
            ) : null}
          </div>
          <p className="text-sm text-ink-2 mt-2">
            {isPro
              ? billingLive
                ? "You're on Atlas Pro — unlimited marking and custom papers."
                : "You have full access during early access."
              : "You're on the free plan. Upgrade for unlimited marking and custom papers."}
          </p>
          {billingErr && <p className="text-sm text-danger mt-2">{billingErr}</p>}
        </Card>
      )}

      {/* Sign out — works on mobile and desktop */}
      <form action={signOut}>
        <Button variant="secondary" className="w-full" type="submit">
          <LogOut size={16} /> Sign out
        </Button>
      </form>
    </div>
  );
}
