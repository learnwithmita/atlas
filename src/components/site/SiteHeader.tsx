import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { getProfile } from "@/lib/data";

export async function SiteHeader() {
  const profile = await getProfile();
  const dashboardHref =
    profile?.role === "admin"
      ? "/admin"
      : profile?.role === "tutor"
        ? "/teach"
        : "/learn";

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Logo href="/" />
        <nav className="hidden sm:flex items-center gap-7 text-[15px] text-ink-2">
          <Link href="/#features" className="hover:text-ink transition-colors">
            Features
          </Link>
          <Link href="/#how" className="hover:text-ink transition-colors">
            How it works
          </Link>
          <Link href="/pricing" className="hover:text-ink transition-colors">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {profile ? (
            <LinkButton href={dashboardHref} size="sm">
              {profile.role === "student" ? "Back to learning" : "Dashboard"}
              <ArrowRight size={15} />
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                Sign in
              </LinkButton>
              <LinkButton href="/signup" size="sm">
                Get started
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
