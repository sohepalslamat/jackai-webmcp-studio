'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConsentProvider, useConsent } from '../lib/consent/ConsentProvider';
import { ConsentDialog } from '../components/ConsentDialog';
import { AgentPanel } from '../components/AgentPanel';
import { ToolsHost } from '../lib/tools/ToolsHost';

/**
 * Everything stateful mounts here, in the layout rather than in a page, so the
 * ledger and the tool registrations survive client navigation. Only a hard
 * reload resets the studio.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider>
      <ToolsHost />
      <Shell>{children}</Shell>
      <ConsentDialog />
    </ConsentProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Masthead panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((v) => !v)} />

      <div className="flex flex-1 flex-col lg:flex-row">
        <main className="min-w-0 flex-1 px-6 py-10 lg:px-12">
          <div className="mx-auto w-full max-w-2xl">{children}</div>
        </main>

        {/* The instrument panel: a permanent right-hand rail on wide screens,
            a drawer on mobile. It is where the gate becomes visible. */}
        <aside
          className={`${
            panelOpen ? 'block' : 'hidden'
          } w-full shrink-0 border-t border-[var(--color-rule)] lg:block lg:w-[22rem] lg:border-l lg:border-t-0 xl:w-[24rem]`}
        >
          <div className="lg:sticky lg:top-[2.75rem] lg:h-[calc(100vh-2.75rem)] lg:overflow-y-auto">
            <AgentPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * A status strip rather than a header. It reports what the room is doing:
 * whether an agent surface exists, and how many decisions the gate has taken.
 */
function Masthead({
  panelOpen,
  onTogglePanel,
}: {
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const { entries } = useConsent();
  const blocked = entries.length;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-rule)] bg-[var(--color-void)]/95 backdrop-blur">
      <div className="flex h-11 items-center gap-4 px-6 lg:px-12">
        <Link href="/" className="group flex items-baseline gap-3">
          <span
            className="text-sm font-bold tracking-tight text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ASSISTANT&nbsp;STUDIO
          </span>
          <span className="stamp hidden sm:inline">consent gate</span>
        </Link>

        <div className="ms-auto flex items-center gap-5">
          <span className="stamp tabular hidden md:inline">
            gate decisions {String(blocked).padStart(2, '0')}
          </span>

          <button
            onClick={onTogglePanel}
            aria-expanded={panelOpen}
            className="stamp border border-[var(--color-rule-bright)] px-2.5 py-1 text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-alarm)] hover:text-[var(--color-ink)] lg:hidden"
          >
            {panelOpen ? 'hide' : 'panel'}
          </button>
        </div>
      </div>
    </header>
  );
}
