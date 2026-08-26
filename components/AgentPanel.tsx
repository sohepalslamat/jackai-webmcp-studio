'use client';

import { useEffect, useState } from 'react';
import { useConsent } from '../lib/consent/ConsentProvider';
import { CONSENT_TTL_MS, sensitivityOf } from '../lib/contracts';

/**
 * لوحة جانبية تُظهر ما لا يظهر عادةً: الأدوات المسجّلة الآن، وكل قرار بوابة
 * لحظةَ وقوعه. من دونها لن يرى المحكّم شيئًا في فيديو مدته ثلاث دقائق.
 */
export function AgentPanel() {
  const { entries, calls } = useConsent();
  const [registered, setRegistered] = useState<string[]>([]);
  const [, tick] = useState(0);

  // تتبّع الأدوات المسجّلة فعليًا عبر حدث toolchange.
  useEffect(() => {
    const mc = (document as any).modelContext;
    if (!mc) return;

    const refresh = async () => {
      try {
        const tools = await mc.getTools();
        setRegistered(tools.map((t: any) => t.name));
      } catch {
        setRegistered([]);
      }
    };

    refresh();
    mc.addEventListener?.('toolchange', refresh);
    return () => mc.removeEventListener?.('toolchange', refresh);
  }, []);

  // يبقي عدّاد المهلة حيًّا.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hasContext = typeof document !== 'undefined' && !!(document as any).modelContext;

  return (
    <aside className="flex h-full w-full flex-col gap-6 border-s border-slate-200 bg-slate-50/60 p-5 text-sm">
      <header>
        <h2 className="font-semibold text-slate-900">جسر الوكيل</h2>
        <p className="mt-1 text-xs text-slate-500">
          {hasContext
            ? 'WebMCP متاح في هذا المتصفح.'
            : 'افتح الصفحة في متصفح ChatGPT المدمج، أو في كروم بعد تفعيل chrome://flags/#enable-webmcp-testing.'}
        </p>
      </header>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          الأدوات المسجّلة الآن
        </h3>
        {registered.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">لا أدوات بعد.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {registered.map((name) => {
              const high = isKnown(name) && sensitivityOf(name as any) === 'high';
              return (
                <li key={name} className="flex items-center justify-between gap-2">
                  <code className="text-xs text-slate-700">{name}</code>
                  {high && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      يحتاج تأكيد
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          قرارات البوابة
        </h3>
        {entries.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            لم يطلب الوكيل فعلًا حسّاسًا بعد.
          </p>
        ) : (
          <ol className="mt-2 space-y-2">
            {entries.map((e) => {
              const left =
                e.status === 'granted' && e.decidedAt
                  ? Math.max(0, Math.ceil((CONSENT_TTL_MS - (Date.now() - e.decidedAt)) / 1000))
                  : null;
              return (
                <li key={e.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-slate-800">{e.tool}</code>
                    <StatusTag status={e.status} />
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500" title={e.summary}>
                    {e.summary}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">
                    {e.hash.slice(0, 12)}…
                    {left !== null && <span className="ms-2">سارية {left} ث</span>}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="mt-auto">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          آخر الاستدعاءات
        </h3>
        <ul className="mt-2 space-y-1 font-mono text-[11px]">
          {calls.slice(0, 8).map((c, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="text-slate-600">{c.tool}</span>
              <span className={c.outcome === 'blocked' ? 'text-red-600' : 'text-emerald-700'}>
                {c.outcome === 'blocked' ? 'أُوقف' : 'نُفِّذ'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending: ['بانتظار المستخدم', 'bg-amber-100 text-amber-800'],
    granted: ['مؤكَّدة', 'bg-emerald-100 text-emerald-800'],
    consumed: ['استُهلكت', 'bg-slate-200 text-slate-700'],
    denied: ['مرفوضة', 'bg-red-100 text-red-700'],
    expired: ['انتهت', 'bg-slate-200 text-slate-500'],
  };
  const [label, cls] = map[status] ?? [status, 'bg-slate-200 text-slate-700'];
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

function isKnown(name: string) {
  return [
    'list_assistants',
    'create_assistant',
    'add_knowledge',
    'test_assistant',
    'publish_assistant',
    'share_assistant',
    'delete_assistant',
  ].includes(name);
}
