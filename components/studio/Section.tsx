'use client';

/**
 * A labelled bay in the studio.
 *
 * Sections are separated by a stamped label and a hairline, not by cards. The
 * page reads as one continuous instrument rather than a stack of boxes, which
 * is the whole difference between this and a default dashboard.
 */
export function Section({
  label,
  badge,
  note,
  tone = 'normal',
  children,
}: {
  label: string;
  badge?: React.ReactNode;
  note?: string;
  tone?: 'normal' | 'alarm';
  children: React.ReactNode;
}) {
  const alarm = tone === 'alarm';

  return (
    <section>
      <div
        className={`flex items-baseline justify-between gap-3 border-b pb-2 ${
          alarm ? 'border-[var(--color-alarm-dim)]' : 'border-[var(--color-rule)]'
        }`}
      >
        <h2
          className={`stamp font-semibold ${
            alarm ? 'text-[var(--color-alarm)]' : 'text-[var(--color-ink)]'
          }`}
        >
          {alarm && <span className="me-2 inline-block h-1.5 w-1.5 bg-[var(--color-alarm)]" />}
          {label}
        </h2>
        {badge && <span className="stamp">{badge}</span>}
      </div>

      {note && (
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--color-ink-faint)]">
          {note}
        </p>
      )}

      <div className="mt-5">{children}</div>
    </section>
  );
}
