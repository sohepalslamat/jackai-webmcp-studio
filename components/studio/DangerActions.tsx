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
    <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
      <h3 className="font-medium text-slate-900">Sensitive actions</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        These happen on your click directly. When your agent asks for them instead, they
        pass through the consent gate.
      </p>

      {/* Publish */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="channel" className="text-sm text-slate-700">
          Publish on
        </label>
        <select
          id="channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="web">web</option>
          <option value="whatsapp">whatsapp</option>
          <option value="api">api</option>
        </select>
        <button
          onClick={() => run(() => store.publish(assistant.id, channel))}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Publish
        </button>
      </div>

      {assistant.channels.length > 0 && (
        <p className="mt-2 text-xs text-emerald-800">
          Published on: {assistant.channels.join(', ')}
        </p>
      )}

      {/* Share */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          onClick={() =>
            run(() => {
              store.share(assistant.id, email);
              setEmail('');
            })
          }
          className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Share
        </button>
      </div>

      {assistant.sharedWith.length > 0 && (
        <p className="mt-2 text-xs text-slate-600">
          Shared with: {assistant.sharedWith.join(', ')}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {/* Delete */}
      <div className="mt-5 border-t border-amber-200 pt-4">
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            Delete
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-red-800">Permanent deletion. Sure?</span>
            <button
              onClick={() => {
                store.remove(assistant.id);
                router.push('/');
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
