'use client';

import { useState } from 'react';
import { store, type Assistant } from '../../lib/store';

/**
 * The knowledge base. Its heading and explanation live in the Step that wraps
 * it, so this component is only the list and the composer.
 */
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
    <div>
      {assistant.knowledge.length > 0 && (
        <ul className="mb-5">
          {assistant.knowledge.map((snippet, i) => (
            <li
              key={i}
              className="flex gap-4 border-b border-[var(--color-rule)] py-3 first:pt-0 last:border-0"
            >
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

      <form onSubmit={add}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="We're open Sunday to Thursday, 9am to 6pm."
          className="w-full resize-y border border-[var(--color-rule-bright)] bg-[var(--color-panel)] px-4 py-3 text-sm leading-relaxed text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
        />

        {error && (
          <p role="alert" className="mt-2 text-sm text-[var(--color-halt)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!text.trim()}
          className="stamp mt-3 bg-[var(--color-ink)] px-5 py-2.5 font-semibold text-[var(--color-void)] transition-opacity hover:opacity-90 disabled:opacity-25"
        >
          add to knowledge
        </button>
      </form>
    </div>
  );
}
