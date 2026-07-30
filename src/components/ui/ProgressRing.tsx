import { clamp } from "@/lib/utils";

type Props = {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
};

/** Minimal Apple-style progress ring with a soft gradient. */
export function ProgressRing({
  value,
  size = 132,
  stroke = 10,
  label,
  sublabel,
  className,
}: Props) {
  const v = clamp(value);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (v / 100) * circ;
  const gid = `ring-grad-${size}-${stroke}`;

  return (
    <div className={className} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent-strong)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-ink tabular-nums">
          {label ?? `${Math.round(v)}%`}
        </span>
        {sublabel && (
          <span className="text-xs text-ink-3 mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
