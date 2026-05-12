import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "primary" | "green" | "blue";
}

export function StatCard({ icon: Icon, label, value, detail, tone = "primary" }: StatCardProps) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-icon">
        <Icon size={19} aria-hidden="true" />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
