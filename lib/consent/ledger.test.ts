import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ConsentLedger } from './ledger';
import { actionHash, guarded, REFUSAL, CONSENT_TTL_MS } from '../contracts';

/**
 * اختبارات القبول الأربعة.
 *
 * هذه هي الثوابت نفسها التي تختبرها الورقة (§7.4) على الحارس الحتمي.
 * النموذج هنا معادٍ: يحاول التنفيذ بلا موافقة، ويحاول تمرير موافقة فعل لفعل آخر،
 * ويحاول إعادة استعمال رمز مستهلَك.
 */

let gate: ConsentLedger;
let executed: string[];

const summarize = (tool: string, args: any) => `${tool} → ${JSON.stringify(args)}`;

function tool(name: Parameters<typeof guarded>[0]) {
  return guarded(
    name,
    async (args: any) => {
      executed.push(`${name}:${JSON.stringify(args)}`);
      return 'OK';
    },
    { gate, summarize },
  );
}

/** يحاكي المستخدم وهو ينقر "تأكيد" في الواجهة. */
function userApprovesPending() {
  const p = gate.entries().find((e) => e.status === 'pending');
  if (!p) throw new Error('no pending consent to approve');
  gate.grant(p.id);
  return p;
}

beforeEach(() => {
  gate = new ConsentLedger();
  executed = [];
});

describe('البوابة الحتمية', () => {
  it('1. فعل حسّاس بلا موافقة يُسقَط', async () => {
    const publish = tool('publish_assistant');

    const res = await publish({ id: 'a1' }, {});

    expect(res).toContain(REFUSAL);
    expect(executed).toEqual([]);
    expect(gate.entries()[0].status).toBe('pending');
  });

  it('2. الفعل نفسه بموافقة مطابقة يمرّ', async () => {
    const publish = tool('publish_assistant');

    await publish({ id: 'a1' }, {}); // يفتح الطلب
    userApprovesPending();
    const res = await publish({ id: 'a1' }, {});

    expect(res).toBe('OK');
    expect(executed).toEqual(['publish_assistant:{"id":"a1"}']);
  });

  it('3. موافقة على فعل لا تمرّر فعلًا آخر', async () => {
    const publish = tool('publish_assistant');
    const remove = tool('delete_assistant');

    await publish({ id: 'a1' }, {});
    userApprovesPending(); // المستخدم وافق على النشر فقط

    // (أ) أداة أخرى بالوسائط نفسها
    const r1 = await remove({ id: 'a1' }, {});
    expect(r1).toContain(REFUSAL);

    // (ب) الأداة نفسها بوسائط أخرى
    const r2 = await publish({ id: 'a2' }, {});
    expect(r2).toContain(REFUSAL);

    expect(executed).toEqual([]);
  });

  it('4. الرمز المستهلَك لا يُعاد استعماله', async () => {
    const publish = tool('publish_assistant');

    await publish({ id: 'a1' }, {});
    userApprovesPending();

    const first = await publish({ id: 'a1' }, {});
    const second = await publish({ id: 'a1' }, {});

    expect(first).toBe('OK');
    expect(second).toContain(REFUSAL);
    expect(executed).toHaveLength(1);
  });
});

describe('تفاصيل مساندة', () => {
  it('الأدوات منخفضة الحساسية تمرّ بلا بوابة', async () => {
    const list = tool('list_assistants');
    const res = await list({}, {});
    expect(res).toBe('OK');
    expect(gate.entries()).toHaveLength(0);
  });

  it('الموافقة تنتهي بعد المهلة', async () => {
    vi.useFakeTimers();
    const publish = tool('publish_assistant');

    await publish({ id: 'a1' }, {});
    userApprovesPending();

    vi.advanceTimersByTime(CONSENT_TTL_MS + 1000);

    const res = await publish({ id: 'a1' }, {});
    expect(res).toContain(REFUSAL);
    expect(executed).toEqual([]);
    vi.useRealTimers();
  });

  it('ترتيب مفاتيح الوسائط لا يغيّر التجزئة', async () => {
    const a = await actionHash('publish_assistant', { id: 'a1', channel: 'web' });
    const b = await actionHash('publish_assistant', { channel: 'web', id: 'a1' });
    expect(a).toBe(b);
  });

  it('لا توجد أداة تمنح موافقة', async () => {
    const { TOOL_NAMES } = await import('../contracts');
    for (const n of TOOL_NAMES) {
      expect(n).not.toMatch(/consent|approve|grant|confirm/i);
    }
  });
});
