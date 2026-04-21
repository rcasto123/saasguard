import { Badge } from "@/components/ui/badge";
import type { AppStatus } from "@prisma/client";

const STATUS_CONFIG: Record<AppStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  shadow: { label: "Shadow IT", variant: "destructive" },
  review: { label: "In Review", variant: "secondary" },
  managed: { label: "Managed", variant: "default" },
  denied: { label: "Denied", variant: "outline" },
};

export function AppStatusBadge({ status }: { status: AppStatus }) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
