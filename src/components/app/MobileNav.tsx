"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, MessageCircle, PenLine } from "lucide-react";
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
      ? [{ href: "/admin", label: "Analytics", icon: BarChart3 }]
      : [
          { href: "/learn", label: "Home", icon: Home },
          { href: "/practice", label: "Practice", icon: PenLine },
          { href: "/tutor", label: "Tutor", icon: MessageCircle },
          { href: "/plan", label: "Plan", icon: BookOpen },
        ];

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-hairline bg-surface/80 backdrop-blur-xl">
        <Logo href={role === "admin" ? "/admin" : "/learn"} />
        <div className="flex items-center gap-1">
          {role !== "admin" && <StreakFlame days={streak} size="sm" />}
          <ThemeToggle />
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around h-16 border-t border-hairline bg-surface/90 backdrop-blur-xl pb-safe">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
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
        })}
      </nav>
    </>
  );
}
