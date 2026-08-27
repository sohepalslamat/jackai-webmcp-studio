'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';
import { useAssistant } from '../../../lib/useStore';
import { Step } from '../../../components/studio/Step';
import { KnowledgePanel } from '../../../components/studio/KnowledgePanel';
import { TestChat } from '../../../components/studio/TestChat';
import { DangerActions } from '../../../components/studio/DangerActions';

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Building an assistant is a sequence, so the page is a sequence.
 *
 * The step that is open is the one you have not finished yet, chosen from the
 * assistant's own state rather than remembered separately. Everything else
 * collapses to a line, so there is one thing on screen to act on.
 */
export default function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = use(params);
  // Route params arrive percent-encoded. Decode so a pasted or shared URL
  // resolves to the same assistant the store knows about.
  const id = safeDecode(raw);
  const assistant = useAssistant(id);

  // Which step is open. null means "not chosen yet, use the arrival step".
  const [chosen, setChosen] = useState<number | null>(null);

  if (!assistant) {
    return (
      <div className="border-l-2 border-[var(--color-halt)] bg-[var(--color-panel)] px-5 py-4">
        <p className="stamp text-[var(--color-halt)]">not found</p>
        <p className="mt-2 text-sm text-[var(--color-ink-dim)]">
          No assistant with the id <code style={{ fontFamily: 'var(--font-mono)' }}>{id}</code>.
        </p>
        <Link
          href="/"
          className="stamp mt-4 inline-block border border-[var(--color-rule-bright)] px-4 py-2 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
        >
          ← all assistants
        </Link>
      </div>
    );
  }

  const taught = assistant.knowledge.length > 0;
  const tested = assistant.chat.length > 0;
  const live = assistant.published || assistant.sharedWith.length > 0;

  // The first unfinished step leads, decided once when the page mounts and
  // never recomputed. Re-deriving it on every render would collapse a step the
  // moment its work completed - you click a suggested question, the reply
  // arrives, and the answer you asked for slides shut before you can read it.
  const arrival = useRef<number | null>(null);
  if (arrival.current === null) arrival.current = !taught ? 1 : !tested ? 2 : 3;

  const openStep = chosen ?? arrival.current;
  const at = (n: number) => ({
    open: openStep === n,
    onOpen: () => setChosen(openStep === n ? -1 : n),
  });

  return (
    <div>
      <Link href="/" className="stamp transition-colors hover:text-[var(--color-ink)]">
        ← all assistants
      </Link>

      <header className="mt-6 pb-8">
        <div className="flex items-start justify-between gap-4">
          <h1
            className="min-w-0 text-2xl leading-tight text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {assistant.name}
          </h1>

          {live ? (
            <span className="stamp flex shrink-0 items-center gap-1.5 pt-2 text-[var(--color-signal)]">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--color-signal)]" />
              live
            </span>
          ) : (
            <span className="stamp shrink-0 pt-2">draft</span>
          )}
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {assistant.purpose}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5">
          <Meta label="id" value={assistant.id} />
          <Meta label="tone" value={assistant.tone} />
          <Meta label="replies in" value={assistant.language} />
        </div>
      </header>

      <div className="space-y-2">
        <Step
          n={1}
          title="Teach it"
          hint="Paste anything it should know: opening hours, pricing, a refund policy. It answers from this and nothing else."
          done={taught}
          summary={
            taught
              ? `${assistant.knowledge.length} snippet${assistant.knowledge.length === 1 ? '' : 's'}`
              : 'Nothing yet'
          }
          {...at(1)}
        >
          <KnowledgePanel assistant={assistant} />
        </Step>

        <Step
          n={2}
          title="Try it"
          hint="Send a message the way a customer would, and see what comes back."
          done={tested}
          summary={
            tested
              ? `${Math.floor(assistant.chat.length / 2)} exchange${
                  Math.floor(assistant.chat.length / 2) === 1 ? '' : 's'
                }`
              : 'Not tried yet'
          }
          {...at(2)}
        >
          <TestChat assistant={assistant} />
        </Step>

        <Step
          n={3}
          title="Put it live"
          hint="Publishing, sharing and deleting are the three actions your agent cannot do on its own. Yours run on the click."
          done={live}
          tone="alarm"
          summary={
            assistant.channels.length > 0
              ? `Live on ${assistant.channels.join(', ')}`
              : 'Not published'
          }
          {...at(3)}
        >
          <DangerActions assistant={assistant} />
        </Step>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="stamp">{label}</span>
      <code
        className="text-sm text-[var(--color-ink-dim)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </code>
    </span>
  );
}
