/**
 * العقد المشترك — READ ONLY for agents.
 *
 * كل ما في هذا الملف ثابت وقت البناء. لا يُقرأ شيء منه من وسائط الأداة،
 * ولا من النموذج، ولا من الصفحة أثناء التشغيل. هذا هو الشرط P2 في الورقة:
 * الحساسية موقّعة/ثابتة، فلا يستطيع النموذج تخفيض تصنيف فعل حسّاس ليمرّ.
 *
 * ممنوع على أي مسار عمل تعديل هذا الملف. أي حاجة لتغييره تمرّ عليك أنت.
 */

export type Sensitivity = 'low' | 'high';

/** بيان القدرات. الحساسية هنا وهنا فقط. */
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

/** مدة صلاحية الموافقة بعد منحها. قصيرة عمدًا: الموافقة معاصرة للفعل. */
export const CONSENT_TTL_MS = 120_000;

/** الرد الموحّد عند غياب الموافقة. الوكيل يقرأه ويفهم أن عليه الانتظار. */
export const REFUSAL = 'CONSENT_REQUIRED';

/* ------------------------------------------------------------------ */
/* تجزئة الفعل                                                          */
/* ------------------------------------------------------------------ */

/** JSON بترتيب مفاتيح ثابت، حتى تُنتج الوسائط نفسها التجزئة نفسها دائمًا. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

/**
 * يربط الموافقة بالفعل تحديدًا: اسم الأداة + الوسائط بالضبط.
 * SHA-256 عبر WebCrypto — لا تجزئة بدائية، حتى لا يكون التصادم مسارَ التفاف.
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
/* واجهة البوابة                                                        */
/* ------------------------------------------------------------------ */

export type ConsentStatus = 'pending' | 'granted' | 'denied' | 'consumed' | 'expired';

export interface ConsentEntry {
  id: string;
  tool: ToolName;
  hash: string;
  /** نص يقرؤه المستخدم، تصوغه واجهة التطبيق من الوسائط — لا يصوغه النموذج. */
  summary: string;
  requestedAt: number;
  decidedAt?: number;
  status: ConsentStatus;
}

export interface ConsentGate {
  /** يفتح طلب تأكيد للمستخدم. لا يمنح شيئًا. */
  request(tool: ToolName, hash: string, summary: string): string;
  /** يُستدعى من نقرة المستخدم في الواجهة فقط. غير مكشوف كأداة أبدًا. */
  grant(id: string): void;
  deny(id: string): void;
  /** يستهلك موافقة مطابقة للأداة والتجزئة معًا. مرة واحدة. */
  consume(tool: ToolName, hash: string): boolean;
  entries(): ReadonlyArray<ConsentEntry>;
  subscribe(fn: () => void): () => void;
}

/* ------------------------------------------------------------------ */
/* الغلاف الحارس                                                        */
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
  /** يصوغ نص التأكيد من الوسائط. يعيش في التطبيق، لا في النموذج. */
  summarize: (tool: ToolName, args: any) => string;
  /** للوحة العرض. اختياري. */
  onCall?: (record: ToolCallRecord) => void;
}

/**
 * كل أداة تمرّ من هنا بلا استثناء.
 *
 * الأدوات منخفضة الحساسية تمرّ مباشرة. الحسّاسة تسقط مغلقةً (fail-closed):
 * إن لم توجد موافقة مطابقة للأداة والوسائط، لا يُنفَّذ شيء ويُعرض طلب على المستخدم.
 *
 * ملاحظة: الحساسية تُقرأ من TOOL_MANIFEST لا من args ولا من أي شيء يمرره الوكيل.
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
        `${REFUSAL}: هذا الفعل يحتاج تأكيد المستخدم. ` +
        `عُرض عليه الآن طلب تأكيد داخل الصفحة. ` +
        `انتظر ردّه ثم أعد الاستدعاء بالوسائط نفسها تمامًا. ` +
        `لا يمكنك منح هذه الموافقة بنفسك.`
      );
    }

    opts.onCall?.({ tool: name, at: Date.now(), outcome: 'allowed', hash });
    return execute(args, ctx);
  };
}
