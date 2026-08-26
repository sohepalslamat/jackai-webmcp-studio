/**
 * The shared contract - READ ONLY.
 *
 * Everything here is fixed at build time. None of it is read from tool
 * arguments, from the model, or from the page at runtime. This is condition P2
 * in the paper: sensitivity is signed or fixed, so the model cannot downgrade a
 * sensitive action to make it pass.
 *
 * No work track edits this file. Any need to change it goes through the owner.
 */

export type Sensitivity = 'low' | 'high';

/** The capability manifest. Sensitivity lives here and nowhere else. */
export const TOOL_MANIFEST = {
  list_assistants: { sensitivity: 'low' },
  create_assistant: { sensitivity: 'low' },
  add_knowledge: { sensitivity: 'low' },
  test_assistant: { sensitivity: 'low' },
  publish_assistant: { sensitivity: 'high' },
  share_assistant: { sensitivity: 'high' },
  delete_assistant: { sensitivity: 'high' },
} as const satisfies Record<string, { sensitivity: Sensitivity }>;

export type ToolName = keyof typeof TOOL_MANIFEST;

export const TOOL_NAMES = Object.keys(TOOL_MANIFEST) as ToolName[];

export function isToolName(v: unknown): v is ToolName {
  return typeof v === 'string' && v in TOOL_MANIFEST;
}

export function sensitivityOf(tool: ToolName): Sensitivity {
  return TOOL_MANIFEST[tool].sensitivity;
}

/** How long a consent lives once granted. Short on purpose: consent is contemporaneous. */
export const CONSENT_TTL_MS = 120_000;

/** The single refusal code. The agent reads it and understands it must wait. */
export const REFUSAL = 'CONSENT_REQUIRED';

/* ------------------------------------------------------------------ */
/* Action fingerprinting                                               */
/* ------------------------------------------------------------------ */

/** JSON with a stable key order, so identical arguments always hash identically. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

/**
 * Binds a consent to one exact action: the tool name plus the exact arguments.
 * SHA-256 through WebCrypto rather than a cheap hash, so a collision is not a
 * way around the gate.
 */
export async function actionHash(tool: ToolName, args: unknown): Promise<string> {
  const payload = `${tool}\u0000${canonicalize(args ?? {})}`;
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ------------------------------------------------------------------ */
/* The gate interface                                                  */
/* ------------------------------------------------------------------ */

export type ConsentStatus = 'pending' | 'granted' | 'denied' | 'consumed' | 'expired';

export interface ConsentEntry {
  id: string;
  tool: ToolName;
  hash: string;
  /** Text the user reads, composed by the app from the arguments - never by the model. */
  summary: string;
  requestedAt: number;
  decidedAt?: number;
  status: ConsentStatus;
}

export interface ConsentGate {
  /** Opens a confirmation request for the user. Grants nothing. */
  request(tool: ToolName, hash: string, summary: string): string;
  /** Called only from a user click in the interface. Never exposed as a tool. */
  grant(id: string): void;
  deny(id: string): void;
  /** Consumes a consent matching both the tool and the hash. Once. */
  consume(tool: ToolName, hash: string): boolean;
  entries(): ReadonlyArray<ConsentEntry>;
  subscribe(fn: () => void): () => void;
}

/* ------------------------------------------------------------------ */
/* The guard wrapper                                                   */
/* ------------------------------------------------------------------ */

export interface ToolCallRecord {
  tool: ToolName;
  at: number;
  outcome: 'allowed' | 'blocked';
  hash?: string;
}

export type ToolExecute<A = any> = (args: A, ctx: { signal?: AbortSignal }) => Promise<string>;

export interface GuardOptions {
  gate: ConsentGate;
  /** Composes the confirmation text from the arguments. Lives in the app, not the model. */
  summarize: (tool: ToolName, args: any) => string;
  /** For the display panel. Optional. */
  onCall?: (record: ToolCallRecord) => void;
}

/**
 * Every tool passes through here, without exception.
 *
 * Low-sensitivity tools go straight through. Sensitive ones fail closed: with no
 * consent matching both the tool and the arguments, nothing executes and a
 * request is surfaced to the user instead.
 *
 * Note: sensitivity is read from TOOL_MANIFEST, never from args and never from
 * anything the agent passes in.
 */
export function guarded<A>(
  name: ToolName,
  execute: ToolExecute<A>,
  opts: GuardOptions,
): ToolExecute<A> {
  return async (args: A, ctx: { signal?: AbortSignal } = {}) => {
    if (sensitivityOf(name) === 'low') {
      opts.onCall?.({ tool: name, at: Date.now(), outcome: 'allowed' });
      return execute(args, ctx);
    }

    const hash = await actionHash(name, args);

    if (!opts.gate.consume(name, hash)) {
      opts.gate.request(name, hash, opts.summarize(name, args));
      opts.onCall?.({ tool: name, at: Date.now(), outcome: 'blocked', hash });
      return (
        `${REFUSAL}: this action needs the user's confirmation. ` +
        `A confirmation dialog is now open in the page. ` +
        `Wait for their answer, then call again with exactly the same arguments. ` +
        `You cannot grant this consent yourself.`
      );
    }

    opts.onCall?.({ tool: name, at: Date.now(), outcome: 'allowed', hash });
    return execute(args, ctx);
  };
}
