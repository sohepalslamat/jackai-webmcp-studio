'use client';

import { useState } from 'react';
import { store, type Assistant } from '../../lib/store';
import { Section } from './Section';

export function KnowledgePanel({ assistant }: { assistant: Assistant }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      store.addKnowledge(assistant.id, text);
      setText('');
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
          Nothing yet. Paste text the assistant should know.
        </p>
      ) : (
        <ul>
          {assistant.knowledge.map((snippet, i) => (
            <li key={i} className="flex gap-4 border-b border-[var(--color-rule)] py-3 last:border-0">
              <span className="stamp tabular w-5 shrink-0 pt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="flex-1 text-sm leading-relaxed text-[var(--color-ink-dim)]">{snippet}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Opening hours, refund policy, pricing…"
          className="w-full resize-y border border-[var(--color-rule)] bg-[var(--color-panel)] px-3.5 py-3 text-sm leading-relaxed text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-rule-bright)]"
        />

        {error && (
          <p role="alert" className="mt-2 text-xs text-[var(--color-halt)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="stamp mt-2.5 border border-[var(--color-rule-bright)] px-3.5 py-1.5 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
        >
          + add snippet
        </button>
      </form>
    </Section>
  );
}
