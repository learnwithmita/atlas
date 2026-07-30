"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Home,
  Layers,
  Library,
  MessageCircle,
  PenLine,
  UploadCloud,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { cn } from "@/lib/utils";

export function MobileNav({
  role,
  streak,
}: {
  role: "student" | "tutor" | "admin";
  name: string;
  streak: number;
}) {
  const pathname = usePathname();

  const items =
    role === "admin"
      ? [
          { href: "/admin", label: "Analytics", icon: BarChart3 },
          { href: "/admin/curriculum", label: "Curriculum", icon: Library },
          { href: "/admin/content", label: "Uploads", icon: UploadCloud },
        ]
      : role === "tutor"
        ? [
            { href: "/teach", label: "Classes", icon: Users },
            { href: "/teach/curriculum", label: "Curriculum", icon: Library },
            { href: "/teach/uploads", label: "Materials", icon: UploadCloud },
          ]
        : [
            { href: "/learn", label: "Home", icon: Home },
            { href: "/practice", label: "Practice", icon: PenLine },
            { href: "/cards", label: "Cards", icon: Layers },
            { href: "/tutor", label: "Tutor", icon: MessageCircle },
            { href: "/plan", label: "Plan", icon: BookOpen },
          ];
  const homeHref =
    role === "admin" ? "/admin" : role === "tutor" ? "/teach" : "/learn";

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-hairline bg-surface/80 backdrop-blur-xl">
        <Logo href={homeHref} />
        <div className="flex items-center gap-1">
          {role === "student" && <StreakFlame days={streak} size="sm" />}
          <ThemeToggle />
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around h-16 border-t border-hairline bg-surface/90 backdrop-blur-xl pb-safe">
        {(() => {
          const activeHref = items
            .filter(
              (i) => pathname === i.href || pathname.startsWith(i.href + "/")
            )
            .sort((a, b) => b.href.length - a.href.length)[0]?.href;
          return items.map((item) => {
          const active = activeHref === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[11px] font-medium px-3 py-1",
                active ? "text-accent" : "text-ink-3"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
          });
        })()}
      </nav>
    </>
  );
}
