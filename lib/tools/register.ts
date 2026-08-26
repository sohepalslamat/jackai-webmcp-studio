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
    const nameOf = (id: string) => store.get(id)?.name ?? `unknown assistant (${id})`;
    switch (tool) {
      case 'publish_assistant':
        return `Publish "${nameOf(args?.id)}" to the ${args?.channel ?? '—'} channel`;
      case 'share_assistant':
        return `Share "${nameOf(args?.id)}" with ${args?.email ?? '—'}`;
      case 'delete_assistant':
        return `Delete "${nameOf(args?.id)}" permanently`;
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
  return e instanceof Error ? e.message : 'The action could not be completed.';
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
      description:
        'List the assistants in the studio with the publish state of each one.',
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
        'Create a new assistant. It stays an unpublished draft until the user ' +
        'publishes it explicitly.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The assistant name as the customer sees it',
          },
          purpose: {
            type: 'string',
            description: 'What it does, in one sentence',
          },
          tone: {
            type: 'string',
            enum: ['formal', 'friendly', 'brief'],
            description: 'How the assistant speaks. Defaults to friendly.',
          },
          language: {
            type: 'string',
            enum: ['ar', 'en', 'tr'],
            description: 'The language the assistant replies in. Defaults to ar.',
          },
        },
        required: ['name', 'purpose'],
      },
      execute: wrap('create_assistant', async (a) => {
        try {
          const id = store.create(a);
          return `Created assistant with id ${id}. Not published yet.`;
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
      description: 'Append a snippet of text to an existing assistant\'s knowledge base.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The assistant id, from list_assistants' },
          text: { type: 'string', description: 'The text the assistant should know' },
        },
        required: ['id', 'text'],
      },
      annotations: { untrustedContentHint: true },
      execute: wrap('add_knowledge', async (a) => {
        try {
          const n = store.addKnowledge(a.id, a.text);
          return `The knowledge base now has ${n} snippet(s).`;
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
      description:
        'Send one test message to an assistant and get its reply. Changes nothing.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The assistant id, from list_assistants' },
          message: { type: 'string', description: 'The message to send, as a customer would' },
        },
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
        'Publish an assistant to a live channel. Sensitive: requires the user to ' +
        'confirm inside the page before it runs.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The assistant id, from list_assistants' },
          channel: { type: 'string', enum: ['web', 'whatsapp', 'api'] },
        },
        required: ['id', 'channel'],
      },
      annotations: { readOnlyHint: false },
      execute: wrap('publish_assistant', async (a) => {
        try {
          store.publish(a.id, a.channel);
          return `Published to ${a.channel}.`;
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
        'Share an assistant with a person by email. Sensitive: requires the user ' +
        'to confirm inside the page before it runs.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The assistant id, from list_assistants' },
          email: { type: 'string', description: 'The recipient email address' },
        },
        required: ['id', 'email'],
      },
      execute: wrap('share_assistant', async (a) => {
        try {
          store.share(a.id, a.email);
          return `An invitation was sent to ${a.email}.`;
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
      description:
        'Delete an assistant permanently. Sensitive: requires the user to confirm ' +
        'inside the page before it runs. This cannot be undone.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The assistant id, from list_assistants' },
        },
        required: ['id'],
      },
      execute: wrap('delete_assistant', async (a) => {
        try {
          store.remove(a.id);
          return 'Deleted.';
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
 * The registry is a single global keyed by tool name, so two concurrent
 * registrations do not compose: the second overwrites the first, and then the
 * first one's teardown unregisters the survivor. React StrictMode mounts every
 * effect twice in development, which is exactly that race.
 *
 * One active registration per document, refcounted, keeps the registry honest.
 */
let active: { refs: number; teardown: () => void } | null = null;

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

  if (active) {
    active.refs += 1;
    return releaseOnce(() => {
      if (!active) return;
      active.refs -= 1;
      if (active.refs <= 0) {
        active.teardown();
        active = null;
      }
    });
  }

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

  active = {
    refs: 1,
    teardown: () => {
      unsubscribe();
      highController?.abort();
      highController = null;
      controller.abort();
    },
  };

  return releaseOnce(() => {
    if (!active) return;
    active.refs -= 1;
    if (active.refs <= 0) {
      active.teardown();
      active = null;
    }
  });
}

/** Guards against a caller invoking its unregister function more than once. */
function releaseOnce(fn: () => void): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    fn();
  };
}
