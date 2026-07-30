import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-surface border border-hairline rounded-[20px] p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-2">{label}</p>
        {Icon && (
          <span className="h-8 w-8 grid place-items-center rounded-full bg-accent-soft">
            <Icon size={16} className="text-accent" />
          </span>
        )}
      </div>
      <p className="text-3xl font-semibold text-ink mt-3 tabular-nums">
        {value}
      </p>
      {sub && <p className="text-xs text-ink-3 mt-1">{sub}</p>}
    </div>
  );
}
