'use client';

import Link from 'next/link';
import { useAssistants } from '../lib/useStore';
import { useT } from '../lib/i18n';
import { EmptyState } from '../components/studio/EmptyState';

export default function AssistantsPage() {
  const assistants = useAssistants();
  const { t } = useT();

  if (assistants.length === 0) return <EmptyState />;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-slate-600">
          {assistants.length === 1
            ? t('list.count_one')
            : t('list.count_other', { n: assistants.length })}
        </h2>
        <Link
          href="/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          {t('nav.new')}
        </Link>
      </div>

      <ul className="mt-4 space-y-3">
        {assistants.map((a) => (
          <li key={a.id}>
            <Link
              href={`/assistant/${a.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-slate-900">{a.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.purpose}</p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    a.published
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {a.published ? t('list.published') : t('list.draft')}
                </span>
              </div>

              <p className="mt-3 font-mono text-xs text-slate-400">
                {a.id} · {t('assistant.knowledge_count', { n: a.knowledge.length })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
