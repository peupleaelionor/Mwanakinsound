import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  subtitle?: string;
  href?: string;
  children: ReactNode;
}

/** A titled content block used across the home & discover pages. */
export function Section({ title, subtitle, href, children }: SectionProps) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="flex shrink-0 items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Tout voir <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
