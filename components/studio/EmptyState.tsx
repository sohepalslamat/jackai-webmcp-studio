'use client';

import { useRouter } from 'next/navigation';
import { store } from '../../lib/store';
import { useT } from '../../lib/i18n';

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
  tone: 'رسمي' | 'ودّي' | 'مختصر';
  language: 'ar' | 'en' | 'tr';
  knowledge: string[];
}

const TEMPLATES: Template[] = [
  {
    key: 'support',
    icon: '🎧',
    name: 'مساعد الدعم الفني',
    purpose: 'يجيب أسئلة العملاء عن المنتج ويحلّ المشكلات الشائعة.',
    tone: 'ودّي',
    language: 'ar',
    knowledge: [
      'ساعات الدعم من الأحد إلى الخميس، التاسعة صباحًا حتى السادسة مساءً بتوقيت إسطنبول.',
      'إعادة تعيين كلمة المرور: من صفحة الدخول اضغط «نسيت كلمة المرور» وسيصلك رابط خلال دقيقتين.',
      'لا نطلب كلمة المرور في أي رسالة أو مكالمة. أي طلب كهذا محاولة احتيال.',
    ],
  },
  {
    key: 'sales',
    icon: '💼',
    name: 'مساعد المبيعات',
    purpose: 'يشرح الباقات ويقارن بينها ويحجز مكالمة مع فريق المبيعات.',
    tone: 'رسمي',
    language: 'ar',
    knowledge: [
      'الباقات ثلاث: المبتدئة 49 دولارًا شهريًا، والاحترافية 99، والأعمال 199.',
      'الاشتراك السنوي يوفّر شهرين مجانًا على أي باقة.',
      'التجربة المجانية أربعة عشر يومًا بلا بطاقة ائتمان.',
    ],
  },
  {
    key: 'booking',
    icon: '📅',
    name: 'مساعد الحجوزات',
    purpose: 'يعرض المواعيد المتاحة ويحجز ويؤكّد للعميل.',
    tone: 'مختصر',
    language: 'ar',
    knowledge: [
      'المواعيد متاحة كل نصف ساعة من العاشرة صباحًا حتى الثامنة مساءً.',
      'الإلغاء مجاني قبل الموعد بأربع وعشرين ساعة، وبعدها تُحتسب نصف القيمة.',
      'الحجز الجماعي لأكثر من ستة أشخاص يحتاج تأكيدًا هاتفيًا.',
    ],
  },
];

export function EmptyState() {
  const { t } = useT();
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
      <h2 className="text-lg font-semibold text-slate-900">{t('empty.title')}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">{t('empty.body')}</p>

      <button
        onClick={() => router.push('/new')}
        className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        {t('empty.create')}
      </button>

      <p className="mt-8 text-xs font-medium uppercase tracking-wide text-slate-500">
        {t('empty.templates')}
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
