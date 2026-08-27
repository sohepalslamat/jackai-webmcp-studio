'use client';

import { useState } from 'react';
import { store, type Assistant } from '../../lib/store';

/**
 * The test box. Calls store.test directly: this is the human path, and the
 * human is present by their own click.
 *
 * An empty box with a placeholder told nobody what to type or what would come
 * back, so the whole feature read as decoration. The suggestions below are
 * built from the assistant's own knowledge, which makes them always relevant
 * and demonstrates the connection between what you taught it and what it says.
 */
export function TestChat({ assistant }: { assistant: Assistant }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (text: string) => {
    if (busy || !text.trim()) return;
    setError(null);
    setBusy(true);
    setMessage('');
    try {
      await store.test(assistant.id, text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const untaught = assistant.knowledge.length === 0;
  const suggestions = suggestFrom(assistant.knowledge);

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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(message);
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask it something…"
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

      {suggestions.length > 0 && (
        <div className="mt-4">
          <p className="stamp mb-2">try asking</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((q) => (
              <li key={q}>
                <button
                  onClick={() => ask(q)}
                  disabled={busy}
                  className="border border-[var(--color-rule)] px-3 py-1.5 text-left text-sm text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)] disabled:opacity-40"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 border-t border-[var(--color-rule)] pt-3 text-xs leading-relaxed text-[var(--color-ink-faint)]">
        Replies are composed from this assistant&apos;s own knowledge and tone.
        There is no language model behind them and no API key in this
        repository: the subject here is the consent gate, not the wording.
      </p>
    </div>
  );
}

/**
 * Turns knowledge snippets into questions a person can click.
 *
 * A snippet is a statement; the question is whatever the statement answers.
 * A few cheap patterns cover the common shapes, and anything unmatched falls
 * back to asking about the snippet's own subject.
 */
function suggestFrom(knowledge: string[]): string[] {
  const out: string[] = [];

  for (const snippet of knowledge.slice(0, 3)) {
    const s = snippet.toLowerCase();

    if (/hour|open|close|9am|am to|pm/.test(s)) {
      out.push('What are your opening hours?');
    } else if (/password|reset|sign-in|login/.test(s)) {
      out.push('How do I reset my password?');
    } else if (/plan|price|\$|cost|month/.test(s)) {
      out.push('How much does it cost?');
    } else if (/trial|free/.test(s)) {
      out.push('Is there a free trial?');
    } else if (/cancel|refund/.test(s)) {
      out.push('What is your cancellation policy?');
    } else if (/book|slot|appointment/.test(s)) {
      out.push('How do I book an appointment?');
    } else if (/annual|discount|save/.test(s)) {
      out.push('Do you offer any discounts?');
    } else {
      // Fall back to the first few words, which name the subject.
      const subject = snippet.split(/\s+/).slice(0, 4).join(' ').replace(/[.,:;]$/, '');
      out.push(`Tell me about ${subject.toLowerCase()}`);
    }
  }

  return [...new Set(out)];
}
