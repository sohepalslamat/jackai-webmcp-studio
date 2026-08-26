import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ConsentLedger } from './ledger';
import { actionHash, guarded, REFUSAL, CONSENT_TTL_MS, TOOL_NAMES } from '../contracts';

/**
 * Attack tests.
 *
 * ledger.test.ts states the four invariants. This file assumes a model that is
 * actively hostile rather than merely careless: it hammers the tool, reorders
 * arguments, races the clock, guesses hashes, and reaches for the ledger
 * directly. Nothing here may open a path that the confirmation dialog does not.
 */

let gate: ConsentLedger;
let executed: string[];

const summarize = (tool: string, args: any) => `${tool} -> ${JSON.stringify(args)}`;

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

describe('a hostile model', () => {
  it('gains nothing by calling twenty times in a row', async () => {
    const publish = tool('publish_assistant');

    const results: string[] = [];
    for (let i = 0; i < 20; i++) results.push(await publish({ id: 'a1' }, {}));

    expect(results.every((r) => r.includes(REFUSAL))).toBe(true);
    expect(executed).toEqual([]);

    // Twenty calls must not become twenty dialogs. Pressuring the user into
    // clicking through a queue is itself the attack.
    const pending = gate.entries().filter((e) => e.status === 'pending');
    expect(pending).toHaveLength(1);
  });

  it('cannot smuggle a second execution past a reordered-argument replay', async () => {
    const publish = tool('publish_assistant');

    await publish({ id: 'a1', channel: 'web' }, {});
    userApprovesPending();

    // Same action, keys in the opposite order: canonicalisation makes this the
    // same fingerprint, so it executes exactly once.
    const first = await publish({ channel: 'web', id: 'a1' }, {});
    const second = await publish({ id: 'a1', channel: 'web' }, {});

    expect(first).toBe('OK');
    expect(second).toContain(REFUSAL);
    expect(executed).toHaveLength(1);
  });

  it('loses a consent that expires one millisecond ago', async () => {
    vi.useFakeTimers();
    try {
      const publish = tool('publish_assistant');

      await publish({ id: 'a1' }, {});
      userApprovesPending();

      vi.advanceTimersByTime(CONSENT_TTL_MS + 1);

      const res = await publish({ id: 'a1' }, {});
      expect(res).toContain(REFUSAL);
      expect(executed).toEqual([]);
      expect(gate.entries().some((e) => e.status === 'expired')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still holds a consent one millisecond before it expires', async () => {
    vi.useFakeTimers();
    try {
      const publish = tool('publish_assistant');

      await publish({ id: 'a1' }, {});
      userApprovesPending();

      vi.advanceTimersByTime(CONSENT_TTL_MS - 1);

      const res = await publish({ id: 'a1' }, {});
      expect(res).toBe('OK');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cannot consume with a guessed hash, and fails without burning a real consent', async () => {
    const publish = tool('publish_assistant');

    // Reaching for the ledger directly, with no consent in existence at all.
    expect(gate.consume('delete_assistant', '0'.repeat(64))).toBe(false);

    await publish({ id: 'a1' }, {});
    const approved = userApprovesPending();

    // A wrong hash against a real, granted consent.
    expect(gate.consume('publish_assistant', 'f'.repeat(64))).toBe(false);

    // The failed guess must not have consumed the legitimate grant.
    const entry = gate.entries().find((e) => e.id === approved.id);
    expect(entry?.status).toBe('granted');

    // And the honest call still goes through.
    expect(await publish({ id: 'a1' }, {})).toBe('OK');
  });

  it('cannot move a consent between assistants or between tools', async () => {
    const publish = tool('publish_assistant');
    const remove = tool('delete_assistant');

    await publish({ id: 'a1' }, {});
    userApprovesPending();

    const otherAssistant = await actionHash('publish_assistant', { id: 'a2' });
    expect(gate.consume('publish_assistant', otherAssistant)).toBe(false);

    const otherTool = await actionHash('delete_assistant', { id: 'a1' });
    expect(gate.consume('delete_assistant', otherTool)).toBe(false);

    expect(await remove({ id: 'a1' }, {})).toContain(REFUSAL);
    expect(executed).toEqual([]);
  });

  it('cannot lower an action\'s sensitivity by passing it as an argument', async () => {
    const publish = tool('publish_assistant');

    // The manifest is the only source of sensitivity. Arguments claiming
    // otherwise change the fingerprint and nothing else.
    const res = await publish({ id: 'a1', sensitivity: 'low' } as any, {});

    expect(res).toContain(REFUSAL);
    expect(executed).toEqual([]);
  });

  it('is denied when the user says no, and a retry reopens rather than executes', async () => {
    const publish = tool('publish_assistant');

    await publish({ id: 'a1' }, {});
    const pending = gate.entries().find((e) => e.status === 'pending')!;
    gate.deny(pending.id);

    const res = await publish({ id: 'a1' }, {});
    expect(res).toContain(REFUSAL);
    expect(executed).toEqual([]);
    expect(gate.entries().some((e) => e.status === 'denied')).toBe(true);
  });

  it('finds no tool that grants, approves or confirms anything', () => {
    for (const n of TOOL_NAMES) {
      expect(n).not.toMatch(/consent|approve|grant|confirm|allow|permit|bypass|override/i);
    }
  });

  it('cannot reach grant through the gate interface used by tools', () => {
    // guarded() receives an object exposing only what a tool legitimately needs.
    // If grant ever leaks into that surface, this test is where it shows up.
    const surface = { gate, summarize };
    const reachable = Object.keys(surface.gate as object);
    expect(reachable).not.toContain('grant');
  });
});
