import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}
