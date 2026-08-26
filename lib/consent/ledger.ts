import {
  CONSENT_TTL_MS,
  type ConsentEntry,
  type ConsentGate,
  type ToolName,
} from '../contracts';

/**
 * سجلّ الموافقة.
 *
 * قاعدتان تحملان كل شيء:
 *  1. لا يُكتب فيه إلا من نقرة المستخدم في واجهة التطبيق. لا توجد أداة تمنح موافقة.
 *  2. الموافقة مربوطة بـ(الأداة + تجزئة الوسائط) وتُستهلك مرة واحدة وتنتهي بمهلة.
 *
 * الحالة تعيش في الذاكرة فقط. لا localStorage: موافقة اليوم لا تصلح لجلسة الغد.
 */
export class ConsentLedger implements ConsentGate {
  private items = new Map<string, ConsentEntry>();
  private listeners = new Set<() => void>();
  private seq = 0;

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private newId() {
    this.seq += 1;
    return `c${this.seq}_${Date.now().toString(36)}`;
  }

  private sweep(now = Date.now()) {
    let changed = false;
    for (const e of this.items.values()) {
      if (e.status === 'granted' && e.decidedAt && now - e.decidedAt > CONSENT_TTL_MS) {
        e.status = 'expired';
        changed = true;
      }
    }
    return changed;
  }

  request(tool: ToolName, hash: string, summary: string): string {
    this.sweep();

    // إن كان هناك طلب معلّق لنفس الفعل، لا تُكرّره — لا نُغرق المستخدم بنوافذ.
    for (const e of this.items.values()) {
      if (e.status === 'pending' && e.tool === tool && e.hash === hash) return e.id;
    }

    const entry: ConsentEntry = {
      id: this.newId(),
      tool,
      hash,
      summary,
      requestedAt: Date.now(),
      status: 'pending',
    };
    this.items.set(entry.id, entry);
    this.emit();
    return entry.id;
  }

  /** يُستدعى من onClick في ConsentDialog. لا شيء غير ذلك يستدعيه. */
  grant(id: string): void {
    const e = this.items.get(id);
    if (!e || e.status !== 'pending') return;
    e.status = 'granted';
    e.decidedAt = Date.now();
    this.emit();
  }

  deny(id: string): void {
    const e = this.items.get(id);
    if (!e || e.status !== 'pending') return;
    e.status = 'denied';
    e.decidedAt = Date.now();
    this.emit();
  }

  /**
   * يبحث عن موافقة ممنوحة سارية تطابق الأداة والتجزئة معًا.
   *
   * المطابقة على الاثنين معًا هي ما يجعل الموافقة "مربوطة بالفعل":
   * موافقةٌ على نشر المساعد أ لا تمرّ لحذف المساعد ب، ولا حتى لنشر المساعد ب.
   */
  consume(tool: ToolName, hash: string): boolean {
    const now = Date.now();
    this.sweep(now);

    for (const e of this.items.values()) {
      if (e.status !== 'granted') continue;
      if (e.tool !== tool) continue;
      if (e.hash !== hash) continue;
      if (!e.decidedAt || now - e.decidedAt > CONSENT_TTL_MS) continue;

      e.status = 'consumed';
      this.emit();
      return true;
    }

    this.emit();
    return false;
  }

  entries(): ReadonlyArray<ConsentEntry> {
    this.sweep();
    return [...this.items.values()].sort((a, b) => b.requestedAt - a.requestedAt);
  }

  pending(): ConsentEntry | undefined {
    return this.entries().find((e) => e.status === 'pending');
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** للاختبارات فقط. */
  reset(): void {
    this.items.clear();
    this.seq = 0;
    this.emit();
  }
}
