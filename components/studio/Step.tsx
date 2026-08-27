'use client';

/**
 * One step in building an assistant.
 *
 * The page is a numbered sequence, not a pile of panels. Each step announces
 * where it sits in the flow, whether it is done, and what it is for. A step
 * that is not the current one collapses to a single line, so there is exactly
 * one thing to look at.
 *
 * This is the fix for the real complaint: the old page put test, publish and
 * knowledge side by side with no order, so nothing told a first-time visitor
 * what to do next.
 */
export function Step({
  n,
  title,
  hint,
  done,
  open,
  onOpen,
  summary,
  tone = 'normal',
  children,
}: {
  n: number;
  title: string;
  hint: string;
  done: boolean;
  open: boolean;
  onOpen: () => void;
  /** One line shown when collapsed: what this step currently holds. */
  summary?: string;
  tone?: 'normal' | 'alarm';
  children: React.ReactNode;
}) {
  const alarm = tone === 'alarm';

  return (
    <section
      className={`border-l-2 ${
        open
          ? alarm
            ? 'border-[var(--color-alarm)]'
            : 'border-[var(--color-ink-dim)]'
          : 'border-[var(--color-rule)]'
      }`}
    >
      <button
        onClick={onOpen}
        aria-expanded={open}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--color-panel)]/50"
      >
        <StepMark n={n} done={done} active={open} alarm={alarm} />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={`text-base ${
                open ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </span>
            {done && !open && (
              <span className="stamp text-[var(--color-signal)]">done</span>
            )}
          </span>

          {open ? (
            <span className="mt-1.5 block text-sm leading-relaxed text-[var(--color-ink-faint)]">
              {hint}
            </span>
          ) : (
            summary && (
              <span className="mt-1 block truncate text-sm text-[var(--color-ink-faint)]">
                {summary}
              </span>
            )
          )}
        </span>

        <span className="stamp shrink-0 pt-1 text-[var(--color-ink-faint)]">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && <div className="px-5 pb-6 ps-[4.25rem]">{children}</div>}
    </section>
  );
}

/** The step number, which doubles as the progress indicator. */
function StepMark({
  n,
  done,
  active,
  alarm,
}: {
  n: number;
  done: boolean;
  active: boolean;
  alarm: boolean;
}) {
  const base =
    'flex h-8 w-8 shrink-0 items-center justify-center border text-sm tabular';

  if (done) {
    return (
      <span
        className={`${base} border-[var(--color-signal)] text-[var(--color-signal)]`}
        style={{ fontFamily: 'var(--font-display)' }}
        aria-hidden="true"
      >
        ✓
      </span>
    );
  }

  return (
    <span
      className={`${base} ${
        active
          ? alarm
            ? 'border-[var(--color-alarm)] bg-[var(--color-alarm)] text-[var(--color-void)]'
            : 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-void)]'
          : 'border-[var(--color-rule-bright)] text-[var(--color-ink-faint)]'
      }`}
      style={{ fontFamily: 'var(--font-display)' }}
      aria-hidden="true"
    >
      {n}
    </span>
  );
}
