import { Star, CalendarDots, Users, Target, Fire } from "@phosphor-icons/react/dist/ssr";

const icons = {
  sessions: CalendarDots,
  mentees: Users,
  rating: Star,
  goals: Target,
  streak: Fire,
  mentors: Users,
} as const;

export function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: keyof typeof icons;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  const Icon = icons[icon];
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={14} />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}
