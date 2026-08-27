'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { store, type Assistant } from '../../lib/store';

/**
 * Publish, share and delete for the human.
 *
 * These call the store directly and never touch the consent gate. The gate
 * exists to make an absent human present; here the human is present already,
 * and their click is the consent. Routing a person through a confirmation of
 * their own click would be theatre, not a guarantee.
 */
export function DangerActions({ assistant }: { assistant: Assistant }) {
  const router = useRouter();

  const [channel, setChannel] = useState('web');
  const [email, setEmail] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => void) => {
    setError(null);
    try {
      fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Publish */}
      <div>
        <p className="stamp mb-2 font-semibold text-[var(--color-ink-dim)]">publish</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            aria-label="Channel"
            className="cursor-pointer border border-[var(--color-rule-bright)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <option value="web">web</option>
            <option value="whatsapp">whatsapp</option>
            <option value="api">api</option>
          </select>
          <button
            onClick={() => run(() => store.publish(assistant.id, channel))}
            className="stamp border border-[var(--color-rule-bright)] px-5 py-2.5 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
          >
            publish
          </button>
        </div>
        {assistant.channels.length > 0 && (
          <p className="stamp mt-2 text-[var(--color-signal)]">
            live on {assistant.channels.join(', ')}
          </p>
        )}
      </div>

      {/* Share */}
      <div>
        <p className="stamp mb-2 font-semibold text-[var(--color-ink-dim)]">share</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            aria-label="Recipient email"
            className="min-w-0 flex-1 border border-[var(--color-rule-bright)] bg-[var(--color-panel)] px-4 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <button
            onClick={() =>
              run(() => {
                store.share(assistant.id, email);
                setEmail('');
              })
            }
            className="stamp shrink-0 border border-[var(--color-rule-bright)] px-5 py-2.5 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
          >
            share
          </button>
        </div>
        {assistant.sharedWith.length > 0 && (
          <p className="stamp mt-2 text-[var(--color-signal)]">
            sent to {assistant.sharedWith.join(', ')}
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="border-l-2 border-[var(--color-halt)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-halt)]"
        >
          {error}
        </p>
      )}

      {/* Delete */}
      <div className="border-t border-[var(--color-rule)] pt-5">
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="stamp text-[var(--color-halt)] transition-opacity hover:opacity-75"
          >
            delete this assistant
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-[var(--color-halt)]">
              Delete for good? This cannot be undone.
            </span>
            <button
              onClick={() => {
                store.remove(assistant.id);
                router.push('/');
              }}
              className="stamp bg-[var(--color-halt)] px-4 py-2 font-semibold text-[var(--color-void)]"
            >
              yes, delete
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="stamp text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
            >
              keep it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
