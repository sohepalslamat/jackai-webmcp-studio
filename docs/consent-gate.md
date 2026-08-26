# The consent gate

Reference for the mechanism: what it guarantees, how it is built, how it is
tested, and what it deliberately does not claim.

Companion to the paper *Whose Stranger Is It?* —
[10.5281/zenodo.20847425](https://doi.org/10.5281/zenodo.20847425).

---

## The problem, stated precisely

WebMCP lets a page hand tools to an agent. The standard carries two annotations
that look like safety metadata: `readOnlyHint` and `untrustedContentHint`.

Both are declared by the page itself.

That is the whole difficulty. The party asserting "this tool is harmless" is the
same party that would benefit from lying, and the standard offers no signing, no
revocation, and no audit levels to check the assertion against. Assumptions P1
and P2 in the paper — that capability metadata is trustworthy and that
sensitivity is fixed by a party with no incentive to lower it — do not hold in a
browser tab.

The response is not to make the annotations trustworthy. It is to stop depending
on them for anything that matters, and to put the decision about sensitive
actions somewhere the model cannot reach.

## Three separated roles

From §6.4 of the paper:

| Role | Who | Where it runs |
|---|---|---|
| Proposes | the agent | inside the model |
| Decides | the policy | deterministic, build-time |
| Executes | the application | outside the model |

The agent never has the last word on a hard limit. It can only ask.

## The mechanism

### Sensitivity is fixed at build time

```ts
export const TOOL_MANIFEST = {
  list_assistants:   { sensitivity: 'low'  },
  create_assistant:  { sensitivity: 'low'  },
  add_knowledge:     { sensitivity: 'low'  },
  test_assistant:    { sensitivity: 'low'  },
  publish_assistant: { sensitivity: 'high' },
  share_assistant:   { sensitivity: 'high' },
  delete_assistant:  { sensitivity: 'high' },
} as const;
```

This lives in `lib/contracts.ts`, which is read-only by policy. Sensitivity is
read from here and from nowhere else — not from tool arguments, not from the
model, not from anything mutable at runtime. An agent that sends
`{sensitivity: 'low'}` alongside a publish request changes the argument
fingerprint and achieves nothing.

### Consent is bound to one exact action

```
fingerprint = SHA-256( tool ‖ 0x00 ‖ canonical(args) )
```

`canonical()` serialises with sorted keys, recursively, so `{id, channel}` and
`{channel, id}` produce identical bytes. Argument order is not a way to mint a
new action, and it is not a way to evade one either.

SHA-256 via WebCrypto rather than a cheap hash: collision resistance is a
security property here, not a performance detail.

### The ledger

An in-memory `Map`, with entries moving through:

```
pending ──grant──► granted ──consume──► consumed
   │                   │
   │                   └──120s──► expired
   └──deny──► denied
```

`consume(tool, hash)` returns true only when an entry exists, is `granted`,
matches **both** the tool and the fingerprint, and has not expired. It then marks
the entry consumed. Every other case returns false and executes nothing.

Nothing is persisted. No `localStorage`, no cookie, no server record: a consent
given today must not be usable tomorrow, so it must not survive the tab.

### The guard

```ts
export function guarded<A>(name, execute, opts): ToolExecute<A> {
  return async (args, ctx) => {
    if (sensitivityOf(name) === 'low') return execute(args, ctx);

    const hash = await actionHash(name, args);
    if (!opts.gate.consume(name, hash)) {
      opts.gate.request(name, hash, opts.summarize(name, args));
      return REFUSAL + ' …a dialog is now open. You cannot grant this yourself.';
    }
    return execute(args, ctx);
  };
}
```

Every tool passes through this wrapper. Low-sensitivity tools go straight
through. High-sensitivity tools fail closed: no matching consent means `execute`
is never invoked, and a request is surfaced to the person instead.

The refusal string tells the agent what happened and what to do — wait, then
retry with identical arguments — and states plainly that it cannot grant the
consent itself. A well-behaved agent escalates to the user. A badly-behaved one
gets nowhere, which is the same outcome.

### The single call site

`gate.grant` is called from exactly one place:

```
components/ConsentDialog.tsx:  onClick={() => gate.grant(pending.id)}
```

Verify it at any time:

```bash
grep -rn "grant(" --include="*.ts" --include="*.tsx" .
```

Legitimate results: the interface definition in `contracts.ts`, the
implementation in `ledger.ts`, the `onClick` above, and the test helpers.
Anything else is a defect.

### What the person is shown

The dialog text is composed by the application from the arguments:

```ts
case 'publish_assistant':
  return `Publish "${nameOf(args?.id)}" to the ${args?.channel ?? '—'} channel`;
```

Never by the model. Otherwise an agent could describe one action while a
different one waits behind the button, and the click would be consent to
something the person never saw. The dialog also shows the tool name and the
fingerprint, so what was approved is inspectable.

Escape denies rather than dismisses. Walking away is never counted as agreement.

## The invariants

The four from §7.4, in `lib/consent/ledger.test.ts`:

| # | Invariant | Test |
|---|---|---|
| 1 | Sensitive action without consent is dropped | `a sensitive action without consent is dropped` |
| 2 | Same action with matching consent executes | `the same action with matching consent passes` |
| 3 | Consent does not transfer to another action | `consent for one action does not pass another` |
| 4 | A consumed consent does not replay | `a consumed token is not replayed` |

Ten more in `lib/consent/adversarial.test.ts` assume an actively hostile model:

- Twenty consecutive calls produce **one** pending dialog, not twenty. Flooding a
  person with modals until one is clicked is itself an attack.
- Reordered argument keys hash identically, so they cannot buy a second run.
- A consent is still valid at TTL − 1 ms and dead at TTL + 1 ms.
- A guessed fingerprint fails **and** leaves a legitimate granted consent intact,
  so guessing cannot burn someone else's approval.
- A consent cannot move between assistants or between tools.
- Sensitivity passed as an argument changes nothing.
- A denied request stays denied; retrying reopens rather than executes.
- No tool name matches `/consent|approve|grant|confirm|allow|permit|bypass|override/i`.
- `grant` is not reachable through the gate surface handed to tools.

Run them:

```bash
pnpm test
```

All four invariants were additionally verified end-to-end in a browser against a
live WebMCP registry — refusal, dialog, approval, execution, replay refusal, and
cross-action refusal — not only at the unit level.

## Limits

**This does not solve prompt injection.** A compromised model still chooses
which action to propose and how persuasively to propose it. If a person approves
a malicious action that was clearly described to them, the gate does exactly what
it was told.

The guarantee is deliberately narrow:

1. A sensitive action never occurs silently.
2. Consent is contemporaneous — 120 seconds, not a session, not forever.
3. Consent is single-use and non-transferable.
4. The guarantee is enforced outside the model, so a misbehaving model cannot
   relax it.

Claiming more than this would be dishonest, and the paper this work comes from
rejects the larger claim explicitly.

Known boundaries worth stating: the argument summary is only as clear as the
application's phrasing; a person who approves without reading has approved; and
in-memory state means a reload is a clean slate, which is a deliberate choice
rather than a limitation to fix.
