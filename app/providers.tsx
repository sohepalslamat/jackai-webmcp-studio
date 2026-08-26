'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConsentProvider } from '../lib/consent/ConsentProvider';
import { ConsentDialog } from '../components/ConsentDialog';
import { AgentPanel } from '../components/AgentPanel';
import { ToolsHost } from '../lib/tools/ToolsHost';
import { LangProvider, useT } from '../lib/i18n';

/**
 * Everything stateful mounts here, in the layout rather than in a page, so the
 * ledger and the tool registrations survive client navigation. Only a hard
 * reload resets the studio.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <ConsentProvider>
        <ToolsHost />
        <Shell>{children}</Shell>
        <ConsentDialog />
      </ConsentProvider>
    </LangProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t, toggle } = useT();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* The agent panel is fixed on the inline-start side in wide viewports and
          a collapsible drawer on mobile. */}
      <div
        className={`${
          panelOpen ? 'block' : 'hidden'
        } order-2 w-full shrink-0 lg:order-1 lg:block lg:w-80 xl:w-96`}
      >
        <div className="lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <AgentPanel />
        </div>
      </div>

      <div className="order-1 flex min-w-0 flex-1 flex-col lg:order-2">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 py-4">
            <Link href="/" className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-slate-900">
                {t('app.title')}
              </h1>
              <p className="truncate text-xs text-slate-500">{t('app.tagline')}</p>
            </Link>

            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 lg:hidden"
              aria-expanded={panelOpen}
            >
              {panelOpen ? t('panel.collapse') : t('panel.expand')}
            </button>

            <button
              onClick={toggle}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              {t('lang.toggle')}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
