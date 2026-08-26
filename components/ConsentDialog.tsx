'use client';

import { useEffect, useRef } from 'react';
import { useConsent } from '../lib/consent/ConsentProvider';

/**
 * نافذة التأكيد.
 *
 * هذا هو المكان الوحيد في التطبيق الذي يُستدعى منه gate.grant.
 * لا أداة WebMCP تصل إليه، ولا يُستدعى برمجيًا من أي مسار آخر.
 *
 * النص المعروض يأتي من summarize في التطبيق، لا من النموذج — حتى لا يصف
 * الوكيل للمستخدم فعلًا غير الذي سيُنفَّذ.
 */
export function ConsentDialog() {
  const { gate, pending } = useConsent();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pending) confirmRef.current?.focus();
  }, [pending?.id]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') gate.deny(pending.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending?.id, gate]);

  if (!pending) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
          الوكيل يطلب تنفيذ فعل حسّاس
        </p>

        <h2 id="consent-title" className="mt-2 text-lg font-semibold text-slate-900">
          {pending.summary}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          هذا الفعل لا يُنفَّذ إلا بتأكيدك. تأكيدك يسري على هذا الفعل بوسائطه هذه
          فقط، ولمرة واحدة، ولمدة دقيقتين.
        </p>

        <dl className="mt-4 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600">
          <div className="flex justify-between gap-4">
            <dt>الأداة</dt>
            <dd className="text-slate-900">{pending.tool}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <dt>بصمة الفعل</dt>
            <dd className="truncate text-slate-900" title={pending.hash}>
              {pending.hash.slice(0, 16)}…
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex gap-3">
          <button
            ref={confirmRef}
            onClick={() => gate.grant(pending.id)}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            تأكيد
          </button>
          <button
            onClick={() => gate.deny(pending.id)}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            رفض
          </button>
        </div>
      </div>
    </div>
  );
}
