/**
 * The studio store.
 *
 * A module-level singleton with the same subscribe/snapshot shape that
 * ConsentProvider already uses with useSyncExternalStore. No external state
 * library: one pattern across the codebase, and the singleton is importable
 * from both React components and registerTools (which is not a hook context).
 *
 * State lives in memory only. No database, no auth, no localStorage.
 * A hard reload is a fresh studio, and that is intentional.
 */

export type Tone = 'رسمي' | 'ودّي' | 'مختصر';
export type Language = 'ar' | 'en' | 'tr';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  at: number;
}

export interface Assistant {
  id: string;
  name: string;
  purpose: string;
  tone: Tone;
  language: Language;
  knowledge: string[];
  published: boolean;
  channels: string[];
  sharedWith: string[];
  chat: ChatTurn[];
  createdAt: number;
}

/** The row shape the `Store` interface in lib/tools/register.ts asks for. */
export interface AssistantSummary {
  id: string;
  name: string;
  purpose: string;
  published: boolean;
}

const TONES: readonly Tone[] = ['رسمي', 'ودّي', 'مختصر'];
const LANGUAGES: readonly Language[] = ['ar', 'en', 'tr'];

/** Simulated round-trip time for a test message, so the UI shows real pending state. */
const TEST_LATENCY_MS = 420;

export class StudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudioError';
  }
}

/* ------------------------------------------------------------------ */
/* Simulated assistant replies                                         */
/* ------------------------------------------------------------------ */

/**
 * Strips Arabic diacritics and normalises letter variants so that "أحمد"
 * and "احمد" score as the same token.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Picks the knowledge snippet with the most token overlap with the message.
 * Deterministic: the same message against the same knowledge always wins the
 * same snippet. Returns null when nothing overlaps at all.
 */
function bestSnippet(knowledge: string[], message: string): string | null {
  const wanted = new Set(tokens(message));
  if (wanted.size === 0) return null;

  let best: string | null = null;
  let bestScore = 0;

  for (const snippet of knowledge) {
    const have = new Set(tokens(snippet));
    let score = 0;
    for (const token of wanted) if (have.has(token)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = snippet;
    }
  }

  return bestScore > 0 ? best : null;
}

function truncate(text: string, max = 240): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Composes a reply from the assistant's own tone, language and knowledge.
 *
 * There is no language model here and no API key in this repository. The point
 * of the demo is the consent gate, not the quality of the reply, and an honest
 * simulation beats a hidden credential.
 */
function composeReply(assistant: Assistant, message: string): string {
  const snippet = bestSnippet(assistant.knowledge, message);
  const { tone, language, name } = assistant;

  if (!snippet) {
    const miss: Record<Language, string> = {
      ar: `لا أجد هذا في معرفتي بعد. أضف نصًّا عن «${truncate(message, 60)}» إلى قاعدة المعرفة وسأعرف الإجابة.`,
      en: `I don't have this in my knowledge yet. Add a note about "${truncate(message, 60)}" to the knowledge base and I'll know it.`,
      tr: `Bu henüz bilgimde yok. Bilgi tabanına "${truncate(message, 60)}" hakkında bir not ekleyin, öğreneyim.`,
    };
    return miss[language];
  }

  const body = truncate(snippet);

  const templates: Record<Language, Record<Tone, string>> = {
    ar: {
      'رسمي': `شكرًا لتواصلكم. بحسب ما لدينا: ${body}\nنبقى في خدمتكم.`,
      'ودّي': `أهلًا! ${body}\nتحبّ تعرف شي ثاني؟`,
      'مختصر': body,
    },
    en: {
      'رسمي': `Thank you for reaching out. According to our records: ${body}\nAt your service.`,
      'ودّي': `Hey! ${body}\nAnything else you'd like to know?`,
      'مختصر': body,
    },
    tr: {
      'رسمي': `İlginiz için teşekkürler. Kayıtlarımıza göre: ${body}\nHizmetinizdeyiz.`,
      'ودّي': `Merhaba! ${body}\nBaşka bir şey öğrenmek ister misiniz?`,
      'مختصر': body,
    },
  };

  const reply = templates[language][tone];
  return assistant.tone === 'مختصر' ? reply : `${reply}\n— ${name}`;
}

/** A delay that actually honours cancellation, so the tool's AbortSignal means something. */
function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new StudioError('أُلغيت التجربة قبل أن تكتمل.'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new StudioError('أُلغيت التجربة قبل أن تكتمل.'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/* ------------------------------------------------------------------ */
/* The store                                                           */
/* ------------------------------------------------------------------ */

export class StudioStore {
  private assistants: Assistant[] = [];
  private snapshot: ReadonlyArray<Assistant> = [];
  private listeners = new Set<() => void>();
  private seq = 0;

  /* ---------- reactivity ---------- */

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  /**
   * Returns a reference that only changes when the data changes, which is what
   * useSyncExternalStore requires to avoid an infinite render loop.
   */
  getSnapshot = (): ReadonlyArray<Assistant> => this.snapshot;

  private commit() {
    this.snapshot = this.assistants.map((a) => ({ ...a }));
    for (const fn of this.listeners) fn();
  }

  private find(id: string): Assistant {
    const found = this.assistants.find((a) => a.id === id);
    if (!found) {
      throw new StudioError(
        `لا يوجد مساعد بالمعرّف «${id}». اعرض قائمة المساعدين أولًا للحصول على المعرّفات الصحيحة.`,
      );
    }
    return found;
  }

  private nextId(name: string): string {
    this.seq += 1;
    const slug = normalize(name).trim().split(/\s+/).slice(0, 2).join('-') || 'assistant';
    return `${slug}-${this.seq}`;
  }

  /* ---------- the Store interface consumed by lib/tools/register.ts ---------- */

  list = (): AssistantSummary[] =>
    this.assistants.map((a) => ({
      id: a.id,
      name: a.name,
      purpose: a.purpose,
      published: a.published,
    }));

  get = (id: string): { id: string; name: string } | undefined => {
    const found = this.assistants.find((a) => a.id === id);
    return found ? { id: found.id, name: found.name } : undefined;
  };

  create = (input: {
    name: string;
    purpose: string;
    tone?: string;
    language?: string;
  }): string => {
    const name = input.name?.trim();
    const purpose = input.purpose?.trim();

    if (!name) throw new StudioError('المساعد يحتاج اسمًا. اكتب اسمًا يراه العميل.');
    if (!purpose) throw new StudioError('المساعد يحتاج غرضًا بجملة واحدة تصف ما يفعله.');

    const tone = TONES.includes(input.tone as Tone) ? (input.tone as Tone) : 'ودّي';
    const language = LANGUAGES.includes(input.language as Language)
      ? (input.language as Language)
      : 'ar';

    const assistant: Assistant = {
      id: this.nextId(name),
      name,
      purpose,
      tone,
      language,
      knowledge: [],
      published: false,
      channels: [],
      sharedWith: [],
      chat: [],
      createdAt: Date.now(),
    };

    this.assistants = [...this.assistants, assistant];
    this.commit();
    return assistant.id;
  };

  addKnowledge = (id: string, text: string): number => {
    const assistant = this.find(id);
    const clean = text?.trim();
    if (!clean) {
      throw new StudioError('النصّ فارغ. الصق مقطعًا يعرف المساعد من خلاله شيئًا جديدًا.');
    }
    assistant.knowledge = [...assistant.knowledge, clean];
    this.commit();
    return assistant.knowledge.length;
  };

  test = async (id: string, message: string, signal?: AbortSignal): Promise<string> => {
    const assistant = this.find(id);
    const clean = message?.trim();
    if (!clean) throw new StudioError('اكتب رسالة لتجربة المساعد بها.');

    assistant.chat = [...assistant.chat, { role: 'user', text: clean, at: Date.now() }];
    this.commit();

    await abortableDelay(TEST_LATENCY_MS, signal);

    const reply = composeReply(assistant, clean);
    assistant.chat = [...assistant.chat, { role: 'assistant', text: reply, at: Date.now() }];
    this.commit();

    return reply;
  };

  publish = (id: string, channel: string): void => {
    const assistant = this.find(id);
    const clean = channel?.trim();
    if (!clean) throw new StudioError('اختر القناة التي يُنشر عليها المساعد.');

    assistant.published = true;
    if (!assistant.channels.includes(clean)) {
      assistant.channels = [...assistant.channels, clean];
    }
    this.commit();
  };

  share = (id: string, email: string): void => {
    const assistant = this.find(id);
    const clean = email?.trim();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      throw new StudioError('البريد غير صالح. اكتب بريدًا بالصيغة name@example.com.');
    }
    if (!assistant.sharedWith.includes(clean)) {
      assistant.sharedWith = [...assistant.sharedWith, clean];
    }
    this.commit();
  };

  remove = (id: string): void => {
    this.find(id);
    this.assistants = this.assistants.filter((a) => a.id !== id);
    this.commit();
  };

  /* ---------- extras used by the UI and by conditional tool registration ---------- */

  /** Drives registration of the high-sensitivity tools: they exist only when a target exists. */
  count = (): number => this.assistants.length;

  getFull = (id: string): Assistant | undefined => this.snapshot.find((a) => a.id === id);

  /** Resets the studio to empty. Used by the UI only, never exposed as a tool. */
  reset = (): void => {
    this.assistants = [];
    this.seq = 0;
    this.commit();
  };
}

export const store = new StudioStore();
