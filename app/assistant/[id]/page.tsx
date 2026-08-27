'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAssistant } from '../../../lib/useStore';
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

export default function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = use(params);
  // Route params arrive percent-encoded. Decode so a pasted or shared URL
  // resolves to the same assistant the store knows about.
  const id = safeDecode(raw);
  const assistant = useAssistant(id);

  if (!assistant) {
    return (
      <div className="trace-in border-l-2 border-[var(--color-halt)] bg-[var(--color-panel)] px-5 py-4">
        <p className="stamp text-[var(--color-halt)]">not found</p>
        <p className="mt-2 text-sm text-[var(--color-ink-dim)]">
          No assistant with the id <code style={{ fontFamily: 'var(--font-mono)' }}>{id}</code>.
        </p>
        <Link
          href="/"
          className="stamp mt-4 inline-block border border-[var(--color-rule-bright)] px-3 py-1.5 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)]"
        >
          ← assistants
        </Link>
      </div>
    );
  }

  return (
    <div className="trace-in">
      <Link href="/" className="stamp transition-colors hover:text-[var(--color-ink)]">
        ← assistants
      </Link>

      <header className="mt-5 border-b border-[var(--color-rule)] pb-6">
        <div className="flex items-start justify-between gap-4">
          <h1
            className="min-w-0 text-2xl leading-tight text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {assistant.name}
          </h1>

          {assistant.published ? (
            <span className="stamp flex shrink-0 items-center gap-1.5 pt-1.5 text-[var(--color-signal)]">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--color-signal)]" />
              live
            </span>
          ) : (
            <span className="stamp shrink-0 pt-1.5">draft</span>
          )}
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">{assistant.purpose}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <Meta label="id" value={assistant.id} />
          <Meta label="tone" value={assistant.tone} />
          <Meta label="replies in" value={assistant.language} />
        </div>
      </header>

      <div className="mt-8 space-y-10">
        <KnowledgePanel assistant={assistant} />
        <TestChat assistant={assistant} />
        <DangerActions assistant={assistant} />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="stamp">{label}</span>
      <code className="text-xs text-[var(--color-ink-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>
        {value}
      </code>
    </span>
  );
}
