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

  const untaught = assistant.knowledge.length === 0;

  return (
    <div>
      {untaught && (
        <p className="mb-4 border-l-2 border-[var(--color-rule-bright)] ps-4 text-sm leading-relaxed text-[var(--color-ink-faint)]">
          It has no knowledge yet, so it will say so. Add a snippet in step 1
          first for a real answer.
        </p>
      )}

      {assistant.chat.length > 0 && (
        <div className="mb-5 space-y-4">
          {assistant.chat.map((turn, i) => (
            <div key={i}>
              <p className="stamp mb-1">{turn.role === 'user' ? 'you' : assistant.name}</p>
              <p
                className={`whitespace-pre-line text-sm leading-relaxed ${
                  turn.role === 'user'
                    ? 'text-[var(--color-ink)]'
                    : 'border-l-2 border-[var(--color-signal-dim)] ps-4 text-[var(--color-ink-dim)]'
                }`}
              >
                {turn.text}
              </p>
            </div>
          ))}

          {busy && (
            <div>
              <p className="stamp mb-1">{assistant.name}</p>
              <p className="live-dot border-l-2 border-[var(--color-signal-dim)] ps-4 text-sm text-[var(--color-ink-faint)]">
                typing…
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-3 text-sm text-[var(--color-halt)]">
          {error}
        </p>
      )}

      <form onSubmit={send} className="flex flex-wrap items-center gap-3">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What are your opening hours?"
          aria-label="Test message"
          className="min-w-0 flex-1 border border-[var(--color-rule-bright)] bg-[var(--color-panel)] px-4 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
        />
        <button
          type="submit"
          disabled={busy || !message.trim()}
          className="stamp shrink-0 bg-[var(--color-ink)] px-5 py-2.5 font-semibold text-[var(--color-void)] transition-opacity hover:opacity-90 disabled:opacity-25"
        >
          send
        </button>
      </form>
    </div>
  );
}
