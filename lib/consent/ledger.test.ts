import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ConsentLedger } from './ledger';
import { actionHash, guarded, REFUSAL, CONSENT_TTL_MS } from '../contracts';

/**
 * The four acceptance tests.
 *
 * These are the same invariants the paper tests against the deterministic guard
 * (SS7.4). The model here is adversarial: it tries to execute without consent,
 * tries to carry one action's consent to another, and tries to replay a
 * consumed token.
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

/** Simulates the user clicking "Confirm" in the interface. */
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

describe('the deterministic gate', () => {
  it('1. a sensitive action without consent is dropped', async () => {
    const publish = tool('publish_assistant');

    const res = await publish({ id: 'a1' }, {});

    expect(res).toContain(REFUSAL);
    expect(executed).toEqual([]);
    expect(gate.entries()[0].status).toBe('pending');
  });

  it('2. the same action with matching consent passes', async () => {
    const publish = tool('publish_assistant');

    await publish({ id: 'a1' }, {}); // opens the request
    userApprovesPending();
    const res = await publish({ id: 'a1' }, {});

    expect(res).toBe('OK');
    expect(executed).toEqual(['publish_assistant:{"id":"a1"}']);
  });

  it('3. consent for one action does not pass another', async () => {
    const publish = tool('publish_assistant');
    const remove = tool('delete_assistant');

    await publish({ id: 'a1' }, {});
    userApprovesPending(); // the user approved publishing only

    // (a) a different tool with the same arguments
    const r1 = await remove({ id: 'a1' }, {});
    expect(r1).toContain(REFUSAL);

    // (b) the same tool with different arguments
    const r2 = await publish({ id: 'a2' }, {});
    expect(r2).toContain(REFUSAL);

    expect(executed).toEqual([]);
  });

  it('4. a consumed token is not replayed', async () => {
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

describe('supporting details', () => {
  it('low-sensitivity tools pass without the gate', async () => {
    const list = tool('list_assistants');
    const res = await list({}, {});
    expect(res).toBe('OK');
    expect(gate.entries()).toHaveLength(0);
  });

  it('consent expires after the TTL', async () => {
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

  it('argument key order does not change the hash', async () => {
    const a = await actionHash('publish_assistant', { id: 'a1', channel: 'web' });
    const b = await actionHash('publish_assistant', { channel: 'web', id: 'a1' });
    expect(a).toBe(b);
  });

  it('no tool grants consent', async () => {
    const { TOOL_NAMES } = await import('../contracts');
    for (const n of TOOL_NAMES) {
      expect(n).not.toMatch(/consent|approve|grant|confirm/i);
    }
  });
});
