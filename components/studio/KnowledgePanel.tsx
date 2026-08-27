'use client';

import { useRef, useState } from 'react';
import { store, type Assistant } from '../../lib/store';
import { Section } from './Section';

/**
 * The knowledge base.
 *
 * The composer stays collapsed until it is wanted. A large empty textarea
 * sitting open on every visit made the page feel both crowded and unused at
 * the same time, which is the worst of both.
 */
export function KnowledgePanel({ assistant }: { assistant: Assistant }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const openComposer = () => {
    setOpen(true);
    requestAnimationFrame(() => boxRef.current?.focus());
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      store.addKnowledge(assistant.id, text);
      setText('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <Section
      label="knowledge base"
      badge={
        <span className="tabular">{String(assistant.knowledge.length).padStart(2, '0')}</span>
      }
    >
      {assistant.knowledge.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-faint)]">
          Nothing yet. Add what the assistant should know.
        </p>
      ) : (
        <ul>
          {assistant.knowledge.map((snippet, i) => (
            <li key={i} className="flex gap-4 border-b border-[var(--color-rule)] py-3 first:pt-0 last:border-0">
              <span className="stamp tabular w-6 shrink-0 pt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="flex-1 text-sm leading-relaxed text-[var(--color-ink-dim)]">
                {snippet}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <button
          onClick={openComposer}
          className="stamp mt-4 border border-[var(--color-rule-bright)] px-4 py-2 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
        >
          + add snippet
        </button>
      ) : (
        <form onSubmit={add} className="mt-4">
          <textarea
            ref={boxRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Opening hours, refund policy, pricing…"
            className="w-full resize-y border border-[var(--color-rule-bright)] bg-[var(--color-panel)] px-4 py-3 text-sm leading-relaxed text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
          />

          {error && (
            <p role="alert" className="mt-2 text-sm text-[var(--color-halt)]">
              {error}
            </p>
          )}

          <div className="mt-3 flex items-center gap-4">
            <button
              type="submit"
              className="stamp bg-[var(--color-ink)] px-4 py-2 font-semibold text-[var(--color-void)] transition-opacity hover:opacity-90"
            >
              save
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setText('');
                setError(null);
              }}
              className="stamp text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
            >
              cancel
            </button>
          </div>
        </form>
      )}
    </Section>
  );
}
