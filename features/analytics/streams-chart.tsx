import { Card } from '@/components/ui/card';

/**
 * Lightweight bar chart rendered with pure CSS — no charting library shipped to
 * the client (keeps the bundle tiny for low-end devices). Accessible via
 * per-bar labels.
 */
export function StreamsChart({ data }: { data: { day: string; streams: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.streams));

  return (
    <Card className="p-4">
      <div className="flex h-40 items-end justify-between gap-2">
        {data.map((d) => {
          const heightPct = Math.round((d.streams / max) * 100);
          const label = new Date(d.day).toLocaleDateString('fr-FR', { weekday: 'short' });
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-gradient-kin transition-all"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
                title={`${d.streams} écoutes`}
                aria-label={`${label}: ${d.streams} écoutes`}
              />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
