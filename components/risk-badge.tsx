import { cn } from "@/lib/utils";

export function RiskBadge({ score }: { score: number }) {
  const label = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  const color = score >= 70
    ? "bg-red-100 text-red-700 border-red-200"
    : score >= 40
    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-green-100 text-green-700 border-green-200";
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", color)}>
      {label} ({score})
    </span>
  );
}
