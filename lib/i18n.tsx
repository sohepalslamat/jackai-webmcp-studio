'use client';

/**
 * Two languages, one flat dictionary, no routing.
 *
 * The interface speaks the user's language, so every string a person can read
 * lives here. Arabic is the default and the document starts in RTL; the toggle
 * flips `lang` and `dir` on the root element and Tailwind's logical properties
 * (ms-*, border-s, text-start) do the rest.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'ar' | 'en';

const DICT = {
  ar: {
    'app.title': 'استوديو المساعدين',
    'app.tagline': 'ابنِ مساعدك بنفسك، أو اطلب من وكيلك أن يبنيه معك.',
    'nav.assistants': 'المساعدون',
    'nav.new': 'مساعد جديد',
    'nav.back': 'رجوع إلى القائمة',
    'lang.toggle': 'English',

    'empty.title': 'لا مساعدين بعد',
    'empty.body': 'ابدأ من قالب جاهز، أو أنشئ مساعدًا من الصفر.',
    'empty.create': 'أنشئ مساعدًا',
    'empty.templates': 'أو ابدأ من هنا:',

    'list.count_one': 'مساعد واحد',
    'list.count_other': '{n} مساعدين',
    'list.published': 'منشور',
    'list.draft': 'مسودّة',
    'list.open': 'افتح',

    'create.title': 'مساعد جديد',
    'create.name': 'الاسم',
    'create.name_hint': 'كما يراه العميل',
    'create.purpose': 'الغرض',
    'create.purpose_hint': 'ما الذي يفعله بجملة واحدة',
    'create.tone': 'النبرة',
    'create.language': 'اللغة',
    'create.submit': 'أنشئ',
    'create.cancel': 'إلغاء',

    'tone.formal': 'رسمي',
    'tone.friendly': 'ودّي',
    'tone.brief': 'مختصر',
    'lang.ar': 'العربية',
    'lang.en': 'الإنجليزية',
    'lang.tr': 'التركية',

    'assistant.knowledge': 'قاعدة المعرفة',
    'assistant.knowledge_empty': 'لا معرفة بعد. الصق نصًّا يعرف المساعد من خلاله شيئًا.',
    'assistant.knowledge_add': 'أضف',
    'assistant.knowledge_placeholder': 'الصق نصًّا: ساعات العمل، سياسة الإرجاع، الأسعار…',
    'assistant.knowledge_count': '{n} مقطعًا',
    'assistant.test': 'جرّب المساعد',
    'assistant.test_placeholder': 'اكتب رسالة كما لو كنت عميلًا…',
    'assistant.test_send': 'أرسل',
    'assistant.test_empty': 'لم تجرّبه بعد. اسأله شيئًا مما يعرفه.',
    'assistant.test_thinking': 'يكتب…',
    'assistant.actions': 'أفعال حسّاسة',
    'assistant.actions_hint':
      'هذه الأفعال تقع بنقرتك مباشرة. حين يطلبها وكيلك بدلًا منك، تمرّ من بوابة التأكيد.',
    'assistant.publish': 'انشر',
    'assistant.publish_on': 'انشر على',
    'assistant.share': 'شارك',
    'assistant.share_placeholder': 'name@example.com',
    'assistant.delete': 'احذف',
    'assistant.delete_confirm': 'حذف نهائي. متأكد؟',
    'assistant.delete_yes': 'نعم، احذف',
    'assistant.delete_no': 'تراجع',
    'assistant.published_on': 'منشور على: {channels}',
    'assistant.shared_with': 'مُشارَك مع: {emails}',
    'assistant.notfound': 'لا يوجد مساعد بهذا المعرّف.',
    'assistant.notfound_back': 'عد إلى القائمة',

    'panel.title': 'ما يراه وكيلك',
    'panel.tools': 'الأدوات المتاحة الآن',
    'panel.tools_none': 'لا أدوات مسجّلة. افتح الصفحة في متصفح يدعم WebMCP.',
    'panel.needs_consent': 'يحتاج تأكيد',
    'panel.decisions': 'قرارات البوابة',
    'panel.decisions_none': 'لا قرارات بعد.',
    'panel.calls': 'آخر الاستدعاءات',
    'panel.calls_none': 'لا استدعاءات بعد.',
    'panel.blocked': 'أُوقف: هذا الفعل يحتاج تأكيدك',
    'panel.allowed': 'نُفِّذ',
    'panel.expires_in': 'تنتهي خلال {s} ثانية',
    'panel.status.pending': 'بانتظارك',
    'panel.status.granted': 'مؤكَّد',
    'panel.status.consumed': 'استُهلك',
    'panel.status.denied': 'مرفوض',
    'panel.status.expired': 'انتهت مهلته',
    'panel.collapse': 'أخفِ اللوحة',
    'panel.expand': 'لوحة الوكيل',

    'dialog.title': 'هذا الفعل يحتاج تأكيدك',
    'dialog.body': 'طلب وكيلك تنفيذ الفعل التالي. لن يقع شيء قبل أن تؤكّد.',
    'dialog.confirm': 'أكّد',
    'dialog.deny': 'ارفض',
    'dialog.fingerprint': 'بصمة الفعل',

    'error.generic': 'حدث خطأ.',
  },
  en: {
    'app.title': 'Assistant Studio',
    'app.tagline': 'Build your assistant yourself, or ask your agent to build it with you.',
    'nav.assistants': 'Assistants',
    'nav.new': 'New assistant',
    'nav.back': 'Back to list',
    'lang.toggle': 'العربية',

    'empty.title': 'No assistants yet',
    'empty.body': 'Start from a template, or create one from scratch.',
    'empty.create': 'Create an assistant',
    'empty.templates': 'Or start here:',

    'list.count_one': '1 assistant',
    'list.count_other': '{n} assistants',
    'list.published': 'Published',
    'list.draft': 'Draft',
    'list.open': 'Open',

    'create.title': 'New assistant',
    'create.name': 'Name',
    'create.name_hint': 'As the customer sees it',
    'create.purpose': 'Purpose',
    'create.purpose_hint': 'What it does, in one sentence',
    'create.tone': 'Tone',
    'create.language': 'Language',
    'create.submit': 'Create',
    'create.cancel': 'Cancel',

    'tone.formal': 'Formal',
    'tone.friendly': 'Friendly',
    'tone.brief': 'Brief',
    'lang.ar': 'Arabic',
    'lang.en': 'English',
    'lang.tr': 'Turkish',

    'assistant.knowledge': 'Knowledge base',
    'assistant.knowledge_empty': 'No knowledge yet. Paste text the assistant should know.',
    'assistant.knowledge_add': 'Add',
    'assistant.knowledge_placeholder': 'Paste text: opening hours, refund policy, pricing…',
    'assistant.knowledge_count': '{n} snippets',
    'assistant.test': 'Test the assistant',
    'assistant.test_placeholder': 'Write a message as if you were a customer…',
    'assistant.test_send': 'Send',
    'assistant.test_empty': "You haven't tested it yet. Ask it something it knows.",
    'assistant.test_thinking': 'Typing…',
    'assistant.actions': 'Sensitive actions',
    'assistant.actions_hint':
      'These happen on your click directly. When your agent asks for them instead, they pass through the consent gate.',
    'assistant.publish': 'Publish',
    'assistant.publish_on': 'Publish on',
    'assistant.share': 'Share',
    'assistant.share_placeholder': 'name@example.com',
    'assistant.delete': 'Delete',
    'assistant.delete_confirm': 'Permanent deletion. Sure?',
    'assistant.delete_yes': 'Yes, delete',
    'assistant.delete_no': 'Cancel',
    'assistant.published_on': 'Published on: {channels}',
    'assistant.shared_with': 'Shared with: {emails}',
    'assistant.notfound': 'No assistant with that id.',
    'assistant.notfound_back': 'Back to the list',

    'panel.title': 'What your agent sees',
    'panel.tools': 'Tools available now',
    'panel.tools_none': 'No tools registered. Open this page in a WebMCP-capable browser.',
    'panel.needs_consent': 'Needs confirmation',
    'panel.decisions': 'Gate decisions',
    'panel.decisions_none': 'No decisions yet.',
    'panel.calls': 'Recent calls',
    'panel.calls_none': 'No calls yet.',
    'panel.blocked': 'Blocked: this action needs your confirmation',
    'panel.allowed': 'Executed',
    'panel.expires_in': 'Expires in {s}s',
    'panel.status.pending': 'Waiting for you',
    'panel.status.granted': 'Confirmed',
    'panel.status.consumed': 'Consumed',
    'panel.status.denied': 'Denied',
    'panel.status.expired': 'Expired',
    'panel.collapse': 'Hide panel',
    'panel.expand': 'Agent panel',

    'dialog.title': 'This action needs your confirmation',
    'dialog.body': 'Your agent asked to run the action below. Nothing happens until you confirm.',
    'dialog.confirm': 'Confirm',
    'dialog.deny': 'Deny',
    'dialog.fingerprint': 'Action fingerprint',

    'error.generic': 'Something went wrong.',
  },
} as const;

export type TKey = keyof (typeof DICT)['ar'];

interface LangContextValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('ar');
  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = (key: TKey, vars?: Record<string, string | number>): string => {
    let out: string = DICT[lang][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
    }
    return out;
  };

  const value: LangContextValue = {
    lang,
    dir,
    setLang,
    toggle: () => setLang((l) => (l === 'ar' ? 'en' : 'ar')),
    t,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): LangContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useT must be used inside <LangProvider>.');
  return ctx;
}

/** Tone and language option labels, kept in sync with the tool input schemas. */
export const TONE_OPTIONS = [
  { value: 'رسمي', key: 'tone.formal' as TKey },
  { value: 'ودّي', key: 'tone.friendly' as TKey },
  { value: 'مختصر', key: 'tone.brief' as TKey },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: 'ar', key: 'lang.ar' as TKey },
  { value: 'en', key: 'lang.en' as TKey },
  { value: 'tr', key: 'lang.tr' as TKey },
] as const;
