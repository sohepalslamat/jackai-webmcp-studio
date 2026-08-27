'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { store, type Assistant } from '../../lib/store';
import { Section } from './Section';

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
    <Section
      label="sensitive actions"
      tone="alarm"
      note="These run on your click, directly. When your agent asks for them instead, they stop at the gate."
    >
      <div className="space-y-5">
        {/* Publish */}
        <Row label="publish">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            aria-label="Channel"
            className="cursor-pointer border-b border-[var(--color-rule-bright)] bg-transparent pb-1 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <option value="web">web</option>
            <option value="whatsapp">whatsapp</option>
            <option value="api">api</option>
          </select>
          <button
            onClick={() => run(() => store.publish(assistant.id, channel))}
            className="stamp border border-[var(--color-rule-bright)] px-3.5 py-1.5 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
          >
            publish →
          </button>
        </Row>

        {assistant.channels.length > 0 && (
          <p className="stamp text-[var(--color-signal)]">
            live on {assistant.channels.join(' · ')}
          </p>
        )}

        {/* Share */}
        <Row label="share">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            aria-label="Recipient email"
            className="min-w-0 flex-1 border-b border-[var(--color-rule-bright)] bg-transparent pb-1 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <button
            onClick={() =>
              run(() => {
                store.share(assistant.id, email);
                setEmail('');
              })
            }
            className="stamp shrink-0 border border-[var(--color-rule-bright)] px-3.5 py-1.5 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
          >
            share →
          </button>
        </Row>

        {assistant.sharedWith.length > 0 && (
          <p className="stamp" style={{ textTransform: 'none', letterSpacing: '0.06em' }}>
            shared with {assistant.sharedWith.join(', ')}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="border-l-2 border-[var(--color-halt)] bg-[var(--color-panel)] px-4 py-2.5 text-sm text-[var(--color-halt)]"
          >
            {error}
          </p>
        )}

        {/* Delete */}
        <div className="border-t border-[var(--color-rule)] pt-5">
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="stamp border border-[var(--color-rule-bright)] px-3.5 py-1.5 text-[var(--color-halt)] transition-colors hover:border-[var(--color-halt)]"
            >
              delete permanently
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="stamp text-[var(--color-halt)]">this cannot be undone</span>
              <button
                onClick={() => {
                  store.remove(assistant.id);
                  router.push('/');
                }}
                className="stamp bg-[var(--color-halt)] px-3.5 py-1.5 font-semibold text-[var(--color-void)]"
              >
                yes, delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="stamp text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-ink)]"
              >
                cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="stamp w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}
