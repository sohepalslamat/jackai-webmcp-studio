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
 *
 * Each action is one labelled row with its control and its verb together, so
 * the block reads as a short list of three things rather than a scatter of
 * inputs.
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
      <div className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
        {/* Publish */}
        <ActionRow
          label="publish"
          status={
            assistant.channels.length > 0
              ? `live on ${assistant.channels.join(' · ')}`
              : undefined
          }
        >
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
          <Verb onClick={() => run(() => store.publish(assistant.id, channel))}>
            publish
          </Verb>
        </ActionRow>

        {/* Share */}
        <ActionRow
          label="share"
          status={
            assistant.sharedWith.length > 0
              ? `sent to ${assistant.sharedWith.join(', ')}`
              : undefined
          }
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            aria-label="Recipient email"
            className="min-w-0 flex-1 border-b border-[var(--color-rule-bright)] bg-transparent pb-1 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <Verb
            onClick={() =>
              run(() => {
                store.share(assistant.id, email);
                setEmail('');
              })
            }
          >
            share
          </Verb>
        </ActionRow>

        {/* Delete */}
        <ActionRow label="delete">
          {!confirmingDelete ? (
            <>
              <span className="flex-1 text-sm text-[var(--color-ink-faint)]">
                Removes this assistant for good.
              </span>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="stamp shrink-0 border border-[var(--color-rule-bright)] px-4 py-2 text-[var(--color-halt)] transition-colors hover:border-[var(--color-halt)]"
              >
                delete
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-[var(--color-halt)]">
                This cannot be undone.
              </span>
              <button
                onClick={() => {
                  store.remove(assistant.id);
                  router.push('/');
                }}
                className="stamp shrink-0 bg-[var(--color-halt)] px-4 py-2 font-semibold text-[var(--color-void)]"
              >
                yes, delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="stamp shrink-0 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
              >
                cancel
              </button>
            </>
          )}
        </ActionRow>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 border-l-2 border-[var(--color-halt)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-halt)]"
        >
          {error}
        </p>
      )}
    </Section>
  );
}

function ActionRow({
  label,
  status,
  children,
}: {
  label: string;
  status?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3">
        <span className="stamp w-16 shrink-0 font-semibold text-[var(--color-ink-dim)]">
          {label}
        </span>
        {children}
      </div>
      {status && (
        <p className="stamp mt-2 ps-20 text-[var(--color-signal)]">{status}</p>
      )}
    </div>
  );
}

function Verb({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="stamp shrink-0 border border-[var(--color-rule-bright)] px-4 py-2 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
    >
      {children} →
    </button>
  );
}
