'use client';

import { useState } from 'react';
import { store, type Assistant } from '../../lib/store';

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
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-slate-900">Knowledge base</h3>
        <span className="text-xs text-slate-500">
          {assistant.knowledge.length} snippet{assistant.knowledge.length === 1 ? '' : 's'}
        </span>
      </div>

      {assistant.knowledge.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No knowledge yet. Paste text the assistant should know.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {assistant.knowledge.map((snippet, i) => (
            <li
              key={i}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700"
            >
              {snippet}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Paste text: opening hours, refund policy, pricing…"
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Add
        </button>
      </form>
    </section>
  );
}
