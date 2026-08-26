'use client';

import { useState } from 'react';
import { store, type Assistant } from '../../lib/store';

/**
 * The test box. Calls store.test directly: this is the human path, and the
 * human is present by their own click.
 */
export function TestChat({ assistant }: { assistant: Assistant }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !message.trim()) return;
    setError(null);
    setBusy(true);
    const sent = message;
    setMessage('');
    try {
      await store.test(assistant.id, sent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">Test the assistant</h3>

      <div className="mt-3 space-y-2">
        {assistant.chat.length === 0 && !busy && (
          <p className="text-sm text-slate-500">
            You haven&apos;t tested it yet. Ask it something it knows.
          </p>
        )}

        {assistant.chat.map((turn, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
              turn.role === 'user'
                ? 'ms-auto bg-slate-900 text-white'
                : 'me-auto bg-slate-100 text-slate-800'
            }`}
          >
            {turn.text}
          </div>
        ))}

        {busy && (
          <div className="me-auto rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
            Typing…
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a message as if you were a customer…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !message.trim()}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Send
        </button>
      </form>
    </section>
  );
}
