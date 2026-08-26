'use client';

import { guarded, type ToolName, type ConsentGate, type ToolCallRecord } from '../contracts';

/* Minimal typings. Swap for the webmcp-types package if you pin it. */
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

/** The store contract provided by the product-core track. */
export interface Store {
  list(): Array<{ id: string; name: string; purpose: string; published: boolean }>;
  get(id: string): { id: string; name: string } | undefined;
  create(input: { name: string; purpose: string; tone?: string; language?: string }): string;
  addKnowledge(id: string, text: string): number;
  test(id: string, message: string, signal?: AbortSignal): Promise<string>;
  publish(id: string, channel: string): void;
  share(id: string, email: string): void;
  remove(id: string): void;
  /** How many assistants exist. Drives registration of the sensitive tools. */
  count(): number;
  /** Notifies on every mutation, so registration can follow state. */
  subscribe(fn: () => void): () => void;
}

export interface RegisterOptions {
  store: Store;
  gate: ConsentGate;
  onCall?: (r: ToolCallRecord) => void;
}

/** The confirmation text the user reads. Composed by the app from the arguments, never by the model. */
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

type Guard = {
  gate: ConsentGate;
  summarize: (tool: ToolName, args: any) => string;
  onCall?: (r: ToolCallRecord) => void;
};

/**
 * Turns a thrown StudioError into a sentence the agent can act on, rather than
 * letting it surface as an opaque tool failure.
 */
function explain(e: unknown): string {
  return e instanceof Error ? e.message : 'تعذّر تنفيذ الفعل.';
}

/* ------------------------------------------------------------------ */
/* Low-sensitivity tools: always registered                            */
/* ------------------------------------------------------------------ */

async function registerLowTools(
  mc: NonNullable<Document['modelContext']>,
  store: Store,
  guard: Guard,
  signal: AbortSignal,
) {
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
        try {
          const id = store.create(a);
          return `أُنشئ المساعد بمعرّف ${id}. لم يُنشر بعد.`;
        } catch (e) {
          return explain(e);
        }
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
        try {
          const n = store.addKnowledge(a.id, a.text);
          return `صار عدد مقاطع المعرفة ${n}.`;
        } catch (e) {
          return explain(e);
        }
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
      execute: wrap('test_assistant', async (a, c) => {
        try {
          // The signal is threaded all the way into the simulated latency, so an
          // agent-side abort actually cancels the run.
          return await store.test(a.id, a.message, c?.signal);
        } catch (e) {
          return explain(e);
        }
      }),
    },
    { signal },
  );
}

/* ------------------------------------------------------------------ */
/* High-sensitivity tools: registered only while a target exists       */
/* ------------------------------------------------------------------ */

async function registerHighTools(
  mc: NonNullable<Document['modelContext']>,
  store: Store,
  guard: Guard,
  signal: AbortSignal,
) {
  const wrap = (name: ToolName, fn: (a: any, c: any) => Promise<string>) =>
    guarded(name, fn, guard);

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
        try {
          store.publish(a.id, a.channel);
          return `نُشر على ${a.channel}.`;
        } catch (e) {
          return explain(e);
        }
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
        try {
          store.share(a.id, a.email);
          return `أُرسلت دعوة إلى ${a.email}.`;
        } catch (e) {
          return explain(e);
        }
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
        try {
          store.remove(a.id);
          return 'حُذف.';
        } catch (e) {
          return explain(e);
        }
      }),
    },
    { signal },
  );
}

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

/**
 * Registers the tools and returns an unregister function.
 *
 * Two deliberate notes:
 *  - publish / share / delete are registered only while at least one assistant
 *    exists. They appear on the first create and disappear when the last one is
 *    deleted, which exercises the standard's state dimension and emits a real
 *    toolchange event.
 *  - No tool grants consent. Searching this file for `grant` finds nothing.
 */
export async function registerTools(opts: RegisterOptions): Promise<() => void> {
  const mc = document.modelContext;
  if (!mc) return () => {};

  const { store, gate, onCall } = opts;
  const guard: Guard = { gate, summarize: summarize(store), onCall };
  const controller = new AbortController();

  await registerLowTools(mc, store, guard, controller.signal);

  // Reconciles the sensitive tools against store state. Every run is chained
  // onto the previous one so a create-then-delete burst cannot interleave into
  // a double registration.
  let highController: AbortController | null = null;
  let queue: Promise<void> = Promise.resolve();

  const syncHigh = () => {
    queue = queue
      .then(async () => {
        if (controller.signal.aborted) return;
        const wanted = store.count() > 0;

        if (wanted && !highController) {
          highController = new AbortController();
          await registerHighTools(mc, store, guard, highController.signal);
        } else if (!wanted && highController) {
          // Aborting unregisters the tools, which fires toolchange.
          highController.abort();
          highController = null;
        }
      })
      .catch(() => {
        // A failed reconcile must not poison the queue for later runs.
      });
  };

  syncHigh();
  const unsubscribe = store.subscribe(syncHigh);

  return () => {
    unsubscribe();
    highController?.abort();
    highController = null;
    controller.abort();
  };
}
