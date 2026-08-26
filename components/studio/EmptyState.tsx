'use client';

import { useRouter } from 'next/navigation';
import { store } from '../../lib/store';
import type { Tone, Language } from '../../lib/store';

/**
 * Emptiness is an invitation to act, not an apology.
 *
 * The three templates each create a fully-populated assistant in one click, so
 * a first-time visitor reaches a working studio without typing anything.
 */

interface Template {
  key: string;
  icon: string;
  name: string;
  purpose: string;
  tone: Tone;
  language: Language;
  knowledge: string[];
}

const TEMPLATES: Template[] = [
  {
    key: 'support',
    icon: '🎧',
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
    icon: '💼',
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
    icon: '📅',
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
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-900">No assistants yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
        Start from a template, or create one from scratch.
      </p>

      <button
        onClick={() => router.push('/new')}
        className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Create an assistant
      </button>

      <p className="mt-8 text-xs font-medium uppercase tracking-wide text-slate-500">
        Or start here
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.key}
            onClick={() => useTemplate(tpl)}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-start transition hover:border-slate-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            <span className="text-xl" aria-hidden="true">
              {tpl.icon}
            </span>
            <span className="mt-2 block text-sm font-medium text-slate-900">{tpl.name}</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-600">
              {tpl.purpose}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
