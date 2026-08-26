'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAssistant } from '../../../lib/useStore';
import { useT } from '../../../lib/i18n';
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
  const { t } = useT();

  if (!assistant) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-700">{t('assistant.notfound')}</p>
        <Link
          href="/"
          className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          {t('assistant.notfound_back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← {t('nav.back')}
        </Link>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{assistant.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{assistant.purpose}</p>
          </div>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
              assistant.published
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {assistant.published ? t('list.published') : t('list.draft')}
          </span>
        </div>

        <p className="mt-2 font-mono text-xs text-slate-400">{assistant.id}</p>
      </div>

      <KnowledgePanel assistant={assistant} />
      <TestChat assistant={assistant} />
      <DangerActions assistant={assistant} />
    </div>
  );
}
