"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  Library,
  MessageCircle,
  PenLine,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };

const studentNav: NavItem[] = [
  { href: "/learn", label: "Home", icon: Home },
  { href: "/practice", label: "Practice", icon: PenLine },
  { href: "/tutor", label: "AI Tutor", icon: MessageCircle },
  { href: "/plan", label: "Study Plan", icon: BookOpen },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/curriculum", label: "Curriculum", icon: Library },
  { href: "/admin/content", label: "Uploads", icon: UploadCloud },
];

/** Longest-prefix match so parent + child routes don't both highlight. */
function activeHref(pathname: string, nav: NavItem[]): string | undefined {
  return nav
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function Sidebar({
  role,
  name,
  streak,
}: {
  role: "student" | "tutor" | "admin";
  name: string;
  streak: number;
}) {
  const pathname = usePathname();
  const nav = role === "admin" ? adminNav : studentNav;
  const active = activeHref(pathname, nav);

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-hairline bg-surface/60 backdrop-blur-xl h-screen sticky top-0 p-5">
      <div className="px-2 py-1">
        <Logo href={role === "admin" ? "/admin" : "/learn"} />
      </div>

      <nav className="mt-8 space-y-1">
        {nav.map((item) => {
          const isActive = active === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 h-11 px-3 rounded-[12px] text-[15px] font-medium transition-colors",
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-ink-2 hover:text-ink hover:bg-surface-2"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {role !== "admin" && (
        <Link
          href="/pricing"
          className="mt-4 flex items-center gap-3 h-11 px-3 rounded-[12px] text-[15px] font-medium text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
        >
          <Sparkles size={19} />
          Upgrade
        </Link>
      )}

      <div className="mt-auto space-y-3">
        {role !== "admin" && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-[12px] bg-flame-soft">
            <span className="text-sm font-medium text-flame">Streak</span>
            <StreakFlame days={streak} size="sm" />
          </div>
        )}

        <div className="flex items-center gap-3 p-2 rounded-[14px] hover:bg-surface-2 transition-colors">
          <div className="h-9 w-9 shrink-0 rounded-full bg-accent grid place-items-center text-white text-sm font-semibold">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">{name}</p>
            <p className="text-xs text-ink-3 capitalize flex items-center gap-1">
              <GraduationCap size={12} /> {role}
            </p>
          </div>
          <ThemeToggle />
        </div>

        <form action={signOut}>
          <button className="w-full h-9 text-sm text-ink-3 hover:text-danger transition-colors text-left px-3">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
