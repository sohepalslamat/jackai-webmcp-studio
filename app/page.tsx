'use client';

import Link from 'next/link';
import { useAssistants } from '../lib/useStore';
import { EmptyState } from '../components/studio/EmptyState';

export default function AssistantsPage() {
  const assistants = useAssistants();

  if (assistants.length === 0) return <EmptyState />;

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
        <h1 className="stamp text-[var(--color-ink-dim)]">
          assistants ·{' '}
          <span className="tabular text-[var(--color-ink)]">
            {String(assistants.length).padStart(2, '0')}
          </span>
        </h1>
        <Link
          href="/new"
          className="stamp border border-[var(--color-rule-bright)] px-3 py-1.5 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
        >
          + new
        </Link>
      </header>

      <ul>
        {assistants.map((a, i) => (
          <li key={a.id} className="trace-in" style={{ animationDelay: `${i * 40}ms` }}>
            <Link
              href={`/assistant/${a.id}`}
              className="group flex items-start gap-5 border-b border-[var(--color-rule)] py-5 transition-colors hover:bg-[var(--color-panel)]/60"
            >
              {/* The index number is part of the instrument, not decoration. */}
              <span
                className="tabular w-8 shrink-0 pt-0.5 text-lg text-[var(--color-ink-faint)] transition-colors group-hover:text-[var(--color-alarm)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <h2
                    className="truncate text-base text-[var(--color-ink)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {a.name}
                  </h2>
                  <StateTag published={a.published} />
                </div>

                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
                  {a.purpose}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <code className="stamp" style={{ letterSpacing: '0.08em' }}>
                    {a.id}
                  </code>
                  <span className="stamp tabular">
                    {String(a.knowledge.length).padStart(2, '0')} snippets
                  </span>
                  {a.channels.length > 0 && (
                    <span className="stamp text-[var(--color-signal-dim)]">
                      {a.channels.join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StateTag({ published }: { published: boolean }) {
  return published ? (
    <span className="stamp flex shrink-0 items-center gap-1.5 text-[var(--color-signal)]">
      <span className="h-1 w-1 rounded-full bg-[var(--color-signal)]" />
      live
    </span>
  ) : (
    <span className="stamp shrink-0 text-[var(--color-ink-faint)]">draft</span>
  );
}
