'use client';

import { useRouter } from 'next/navigation';
import { store } from '../../lib/store';
import type { Tone, Language } from '../../lib/store';

/**
 * Emptiness is an invitation to act, not an apology.
 *
 * The three templates each build a fully-populated assistant in one click, so
 * a first-time visitor reaches a working studio without typing anything. This
 * also preserves the toolchange demonstration: the page loads with four tools,
 * and the sensitive three appear the moment the first assistant exists.
 */

interface Template {
  key: string;
  index: string;
  name: string;
  purpose: string;
  tone: Tone;
  language: Language;
  knowledge: string[];
}

const TEMPLATES: Template[] = [
  {
    key: 'support',
    index: '01',
    name: 'Support Assistant',
    purpose: 'Answers customer questions about the product and resolves common issues.',
    tone: 'friendly',
    language: 'en',
    knowledge: [
      'Support hours are Sunday to Thursday, 9am to 6pm Istanbul time.',
      'To reset a password, click "Forgot password" on the sign-in page. A link arrives within two minutes.',
      'We never ask for your password in a message or a call. Any such request is a scam.',
    ],
  },
  {
    key: 'sales',
    index: '02',
    name: 'Sales Assistant',
    purpose: 'Explains the plans, compares them, and books a call with the sales team.',
    tone: 'formal',
    language: 'en',
    knowledge: [
      'There are three plans: Starter at $49 a month, Pro at $99, and Business at $199.',
      'An annual subscription saves two months on any plan.',
      'The free trial lasts fourteen days and needs no credit card.',
    ],
  },
  {
    key: 'booking',
    index: '03',
    name: 'Booking Assistant',
    purpose: 'Shows available slots, books them, and confirms with the customer.',
    tone: 'brief',
    language: 'en',
    knowledge: [
      'Slots are available every half hour from 10am to 8pm.',
      'Cancelling is free up to 24 hours before the appointment; after that half the fee applies.',
      'Group bookings for more than six people need a phone confirmation.',
    ],
  },
];

export function EmptyState() {
  const router = useRouter();

  const useTemplate = (tpl: Template) => {
    const id = store.create({
      name: tpl.name,
      purpose: tpl.purpose,
      tone: tpl.tone,
      language: tpl.language,
    });
    for (const snippet of tpl.knowledge) store.addKnowledge(id, snippet);
    router.push(`/assistant/${id}`);
  };

  return (
    <div className="trace-in">
      <p className="stamp">no assistants · studio idle</p>

      <h1
        className="mt-6 text-3xl leading-[1.15] text-[var(--color-ink)] sm:text-4xl"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Build one yourself,
        <br />
        <span className="text-[var(--color-ink-faint)]">or let your agent build it</span>
        <br />
        with you.
      </h1>

      <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--color-ink-dim)]">
        Seven tools are exposed to your agent. Four of them run freely. Three of
        them — publish, share, delete — stop at a gate that only your click can
        open.
      </p>

      <button
        onClick={() => router.push('/new')}
        className="mt-7 bg-[var(--color-ink)] px-6 py-3 text-sm font-bold tracking-wide text-[var(--color-void)] transition-opacity hover:opacity-90"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        CREATE AN ASSISTANT
      </button>

      <div className="mt-14 border-t border-[var(--color-rule)] pt-5">
        <p className="stamp">or load a template</p>

        <ul className="mt-3">
          {TEMPLATES.map((tpl, i) => (
            <li key={tpl.key} className="trace-in" style={{ animationDelay: `${120 + i * 60}ms` }}>
              <button
                onClick={() => useTemplate(tpl)}
                className="group flex w-full items-start gap-5 border-b border-[var(--color-rule)] py-4 text-left transition-colors hover:bg-[var(--color-panel)]/60"
              >
                <span
                  className="tabular w-8 shrink-0 pt-0.5 text-lg text-[var(--color-ink-faint)] transition-colors group-hover:text-[var(--color-alarm)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {tpl.index}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-sm text-[var(--color-ink)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {tpl.name}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--color-ink-dim)]">
                    {tpl.purpose}
                  </span>
                </span>
                <span className="stamp shrink-0 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                  load →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
