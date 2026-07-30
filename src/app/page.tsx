import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  FileCheck2,
  LineChart,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { LinkButton } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { getProfile } from "@/lib/data";

const features = [
  {
    icon: FileCheck2,
    title: "Marks like an examiner",
    body: "Not “right or wrong” — you scored 2/4, here's the keyword you missed and how to phrase it for the mark.",
  },
  {
    icon: BrainCircuit,
    title: "Knows your syllabus",
    body: "Grounded in the SEAB syllabus, past papers and mark schemes. Every answer cites its source.",
  },
  {
    icon: LineChart,
    title: "A plan that adapts",
    body: "Atlas tracks what you keep getting wrong and rebuilds your study plan around it — every day.",
  },
  {
    icon: ScanLine,
    title: "Scan & mark",
    body: "Photograph a handwritten script. Atlas reads it, marks it, and points you to the next lesson.",
  },
];

export default async function Landing() {
  const profile = await getProfile();
  const loggedIn = !!profile;
  const dashHref =
    profile?.role === "admin"
      ? "/admin"
      : profile?.role === "tutor"
        ? "/tutor"
        : "/learn";

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, var(--color-accent-soft) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-5 sm:px-8 pt-20 pb-16 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-sm text-ink-2 mb-8 shadow-xs">
            <Sparkles size={14} className="text-accent" />
            Biology & Chemistry · Built for Singapore
          </span>
          <h1 className="text-5xl sm:text-6xl font-semibold text-ink tracking-tight leading-[1.05]">
            The tutor that knows
            <br />
            your syllabus by heart.
          </h1>
          <p className="mx-auto max-w-xl text-lg sm:text-xl text-ink-2 mt-6 leading-relaxed">
            Atlas marks like an SEAB examiner, remembers every mistake you make,
            and turns it into tomorrow&apos;s study plan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
            {loggedIn ? (
              <LinkButton href={dashHref} size="lg">
                {profile?.role === "student" ? "Back to learning" : "Go to dashboard"}{" "}
                <ArrowRight size={18} />
              </LinkButton>
            ) : (
              <LinkButton href="/signup" size="lg">
                Start free <ArrowRight size={18} />
              </LinkButton>
            )}
            <LinkButton href="/pricing" variant="secondary" size="lg">
              See pricing
            </LinkButton>
          </div>
          {!loggedIn && (
            <p className="text-sm text-ink-3 mt-4">
              No card required · Free forever plan
            </p>
          )}
        </div>

        {/* Product glimpse */}
        <div className="mx-auto max-w-4xl px-5 sm:px-8 pb-20">
          <div className="rounded-[28px] border border-hairline bg-surface shadow-lg p-3">
            <div className="rounded-[18px] bg-canvas p-6 sm:p-10">
              <div className="grid sm:grid-cols-3 gap-4">
                <MockStat big value="74%" label="Mastery" />
                <MockStat value="A2" label="Predicted grade" accent />
                <MockStat value="🔥 7" label="Day streak" />
              </div>
              <div className="mt-4 rounded-[16px] border border-hairline p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-flame mb-2">
                  Fix this first
                </p>
                {["Osmosis — 32%", "Enzyme graphs — 41%", "Salt prep — 47%"].map(
                  (t) => (
                    <div
                      key={t}
                      className="flex items-center justify-between py-2 border-b border-hairline last:border-0 text-sm text-ink"
                    >
                      {t}
                      <ArrowRight size={15} className="text-ink-3" />
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 sm:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-4xl font-semibold text-ink tracking-tight">
            Not a question bank with a chatbot.
          </h2>
          <p className="text-lg text-ink-2 mt-4">
            Every surface feels like a tutor who remembers you.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-[22px] border border-hairline bg-surface p-7 shadow-sm"
              >
                <span className="h-11 w-11 grid place-items-center rounded-[14px] bg-accent-soft mb-5">
                  <Icon size={22} className="text-accent" />
                </span>
                <h3 className="text-xl font-semibold text-ink mb-2">
                  {f.title}
                </h3>
                <p className="text-ink-2 leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 sm:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-4xl font-semibold text-ink tracking-tight">
            Three steps to a better grade.
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              n: "01",
              t: "Take the diagnostic",
              b: "A short adaptive quiz builds your mastery map across the syllabus.",
            },
            {
              n: "02",
              t: "Practise & get marked",
              b: "Answer in your own words. Atlas marks it against the scheme, instantly.",
            },
            {
              n: "03",
              t: "Follow the plan",
              b: "Atlas serves the next thing to fix — highest impact first.",
            },
          ].map((s) => (
            <div key={s.n}>
              <span className="text-5xl font-semibold text-accent/25 tabular-nums">
                {s.n}
              </span>
              <h3 className="text-xl font-semibold text-ink mt-3 mb-2">
                {s.t}
              </h3>
              <p className="text-ink-2 leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-10 pb-24">
        <div className="rounded-[28px] bg-ink-static text-white p-12 sm:p-16 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(90% 120% at 20% 0%, #2a2a52 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10">
            <h2 className="text-4xl font-semibold tracking-tight">
              Start tonight. See it move by Sunday.
            </h2>
            <p className="text-white/60 text-lg mt-4 max-w-lg mx-auto">
              Your first weekly report lands in seven days. Most students see
              their weakest topic climb first.
            </p>
            <LinkButton
              href={loggedIn ? dashHref : "/signup"}
              size="lg"
              className="mt-8 bg-white text-ink-static hover:bg-white/90"
            >
              {loggedIn ? "Back to learning" : "Create your free account"}{" "}
              <ArrowRight size={18} />
            </LinkButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo href="/" />
          <p className="text-sm text-ink-3">
            © {new Date().getFullYear()} Atlas · Adaptive Tutoring & Learning
            for Applied Science
          </p>
          <div className="flex gap-6 text-sm text-ink-2">
            <Link href="/pricing" className="hover:text-ink">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

function MockStat({
  value,
  label,
  accent,
  big,
}: {
  value: string;
  label: string;
  accent?: boolean;
  big?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-hairline bg-surface p-5 text-left">
      <p
        className={`font-semibold tabular-nums ${big ? "text-4xl" : "text-3xl"} ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="text-sm text-ink-3 mt-1">{label}</p>
    </div>
  );
}
