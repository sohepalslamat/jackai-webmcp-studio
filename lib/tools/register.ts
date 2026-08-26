'use client';

import { guarded, type ToolName, type ConsentGate, type ToolCallRecord } from '../contracts';

/* أنواع مبسّطة. استبدلها بحزمة webmcp-types إن ثبّتّها. */
declare global {
  interface Document {
    modelContext?: {
      registerTool(
        tool: {
          name: string;
          description: string;
          inputSchema: unknown;
          annotations?: Record<string, unknown>;
          execute: (args: any, ctx: { signal?: AbortSignal }) => Promise<string>;
        },
        opts?: { signal?: AbortSignal; exposedTo?: string[] },
      ): Promise<void>;
      getTools(opts?: { fromOrigins?: string[] }): Promise<any[]>;
      executeTool(tool: any, args: string, opts?: { signal?: AbortSignal }): Promise<string>;
      addEventListener(type: 'toolchange', fn: () => void): void;
      removeEventListener(type: 'toolchange', fn: () => void): void;
    };
  }
}

/** واجهة المتجر التي يوفّرها مسار "نواة المنتج". */
export interface Store {
  list(): Array<{ id: string; name: string; purpose: string; published: boolean }>;
  get(id: string): { id: string; name: string } | undefined;
  create(input: { name: string; purpose: string; tone?: string; language?: string }): string;
  addKnowledge(id: string, text: string): number;
  test(id: string, message: string): Promise<string>;
  publish(id: string, channel: string): void;
  share(id: string, email: string): void;
  remove(id: string): void;
}

export interface RegisterOptions {
  store: Store;
  gate: ConsentGate;
  onCall?: (r: ToolCallRecord) => void;
}

/** نص التأكيد الذي يراه المستخدم. يصوغه التطبيق من الوسائط، لا النموذج. */
function summarize(store: Store) {
  return (tool: ToolName, args: any): string => {
    const nameOf = (id: string) => store.get(id)?.name ?? `مساعد غير معروف (${id})`;
    switch (tool) {
      case 'publish_assistant':
        return `نشر «${nameOf(args?.id)}» على قناة ${args?.channel ?? '—'}`;
      case 'share_assistant':
        return `مشاركة «${nameOf(args?.id)}» مع ${args?.email ?? '—'}`;
      case 'delete_assistant':
        return `حذف «${nameOf(args?.id)}» نهائيًا`;
      default:
        return tool;
    }
  };
}

/**
 * يسجّل الأدوات ويعيد دالة إلغاء.
 *
 * ملاحظتان مقصودتان:
 *  - publish / share / delete تُسجَّل فقط حين يوجد مساعد واحد على الأقل.
 *    هذا يُظهر بُعد "الحالة" في المعيار ويولّد حدث toolchange حقيقيًا.
 *  - لا توجد أداة تمنح موافقة. البحث في هذا الملف عن grant لن يجد شيئًا.
 */
export async function registerTools(opts: RegisterOptions): Promise<() => void> {
  const mc = document.modelContext;
  if (!mc) return () => {};

  const { store, gate, onCall } = opts;
  const guard = { gate, summarize: summarize(store), onCall };
  const controller = new AbortController();
  const signal = controller.signal;

  const wrap = (name: ToolName, fn: (a: any, c: any) => Promise<string>) =>
    guarded(name, fn, guard);

  await mc.registerTool(
    {
      name: 'list_assistants',
      description: 'اعرض المساعدين الموجودين في الاستوديو مع حالة النشر لكل منهم.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: wrap('list_assistants', async () => JSON.stringify(store.list())),
    },
    { signal },
  );

  await mc.registerTool(
    {
      name: 'create_assistant',
      description:
        'أنشئ مساعدًا جديدًا. يبقى مسودّة غير منشورة حتى ينشره المستخدم صراحةً.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'اسم المساعد كما يراه العميل' },
          purpose: { type: 'string', description: 'ما الذي يفعله بجملة واحدة' },
          tone: { type: 'string', enum: ['رسمي', 'ودّي', 'مختصر'] },
          language: { type: 'string', enum: ['ar', 'en', 'tr'] },
        },
        required: ['name', 'purpose'],
      },
      execute: wrap('create_assistant', async (a) => {
        const id = store.create(a);
        return `أُنشئ المساعد بمعرّف ${id}. لم يُنشر بعد.`;
      }),
    },
    { signal },
  );

  await mc.registerTool(
    {
      name: 'add_knowledge',
      description: 'أضف نصًّا إلى قاعدة معرفة مساعد قائم.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['id', 'text'],
      },
      annotations: { untrustedContentHint: true },
      execute: wrap('add_knowledge', async (a) => {
        const n = store.addKnowledge(a.id, a.text);
        return `صار عدد مقاطع المعرفة ${n}.`;
      }),
    },
    { signal },
  );

  await mc.registerTool(
    {
      name: 'test_assistant',
      description: 'جرّب المساعد برسالة واحدة واحصل على ردّه. لا يُغيّر شيئًا.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' }, message: { type: 'string' } },
        required: ['id', 'message'],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: wrap('test_assistant', async (a, c) => store.test(a.id, a.message)),
    },
    { signal },
  );

  /* ---------- الأدوات الحسّاسة: تمرّ من البوابة ---------- */

  await mc.registerTool(
    {
      name: 'publish_assistant',
      description:
        'انشر المساعد على قناة حيّة. فعل حسّاس: يحتاج تأكيد المستخدم داخل الصفحة.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          channel: { type: 'string', enum: ['web', 'whatsapp', 'api'] },
        },
        required: ['id', 'channel'],
      },
      annotations: { readOnlyHint: false },
      execute: wrap('publish_assistant', async (a) => {
        store.publish(a.id, a.channel);
        return `نُشر على ${a.channel}.`;
      }),
    },
    { signal },
  );

  await mc.registerTool(
    {
      name: 'share_assistant',
      description:
        'شارك المساعد مع شخص عبر بريده. فعل حسّاس: يحتاج تأكيد المستخدم داخل الصفحة.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' }, email: { type: 'string' } },
        required: ['id', 'email'],
      },
      execute: wrap('share_assistant', async (a) => {
        store.share(a.id, a.email);
        return `أُرسلت دعوة إلى ${a.email}.`;
      }),
    },
    { signal },
  );

  await mc.registerTool(
    {
      name: 'delete_assistant',
      description: 'احذف مساعدًا نهائيًا. فعل حسّاس: يحتاج تأكيد المستخدم داخل الصفحة.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      execute: wrap('delete_assistant', async (a) => {
        store.remove(a.id);
        return 'حُذف.';
      }),
    },
    { signal },
  );

  return () => controller.abort();
}
