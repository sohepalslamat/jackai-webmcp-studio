'use client';

import { useState } from 'react';
import { store, type Assistant } from '../../lib/store';
import { Section } from './Section';

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
    <Section
      label="test"
      badge={
        assistant.chat.length > 0 ? (
          <span className="tabular">
            {String(Math.floor(assistant.chat.length / 2)).padStart(2, '0')} exchanges
          </span>
        ) : undefined
      }
    >
      {assistant.chat.length === 0 && !busy ? (
        <p className="text-sm text-[var(--color-ink-faint)]">
          Untested. Ask it something it knows.
        </p>
      ) : (
        <div className="space-y-3">
          {assistant.chat.map((turn, i) => (
            <div key={i} className="flex gap-4">
              <span
                className={`stamp w-8 shrink-0 pt-0.5 ${
                  turn.role === 'user' ? 'text-[var(--color-ink-faint)]' : 'text-[var(--color-signal-dim)]'
                }`}
              >
                {turn.role === 'user' ? 'you' : 'bot'}
              </span>
              <p
                className={`flex-1 whitespace-pre-line text-sm leading-relaxed ${
                  turn.role === 'user' ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]'
                }`}
              >
                {turn.text}
              </p>
            </div>
          ))}

          {busy && (
            <div className="flex gap-4">
              <span className="stamp w-8 shrink-0 pt-0.5 text-[var(--color-signal-dim)]">bot</span>
              <span className="live-dot text-sm text-[var(--color-ink-faint)]">…</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-[var(--color-halt)]">
          {error}
        </p>
      )}

      <form onSubmit={send} className="mt-5 flex items-baseline gap-3 border-b border-[var(--color-rule-bright)] pb-2 focus-within:border-[var(--color-alarm)]">
        <span className="stamp shrink-0">msg</span>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write as a customer would…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none"
        />
        <button
          type="submit"
          disabled={busy || !message.trim()}
          className="stamp shrink-0 text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-alarm)] disabled:opacity-30 disabled:hover:text-[var(--color-ink-dim)]"
        >
          send →
        </button>
      </form>
    </Section>
  );
}
