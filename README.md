# Assistant Studio

An assistant-building studio where a person and their agent work on the same
surface. Every sensitive action is governed by a deterministic consent gate
that runs **outside the model**.

Built for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/).
The gate is the deterministic guard from our published paper, embodied in a
product rather than described in prose.

---

## What it does

You build AI assistants: name one, give it a purpose, paste in what it should
know, and test it in a chat box. Publish it to a channel, share it with a
colleague, or delete it.

The whole studio works for a human alone, with no agent anywhere. WebMCP is an
enhancement on top of a working product, never a precondition for it.

When an agent is present, it can drive the same studio through seven tools. Four
of them are ordinary. Three of them can be seen by other people or cannot be
undone — publishing, sharing, deleting — and those three do not execute on the
agent's say-so.

## The gate in one paragraph

An agent calls `publish_assistant`. The guard reads the tool's sensitivity from
a build-time manifest, fingerprints the exact arguments with SHA-256, and looks
for a matching consent. There isn't one, so nothing runs: the call returns a
refusal and a dialog opens in the page showing the person exactly what was
asked, composed by the application rather than by the model. If they
click confirm, a consent is recorded against that tool and that fingerprint. The
agent calls again with identical arguments and it executes — once. The same
consent will not carry a different channel, a different assistant, a different
tool, or a second attempt, and it expires two minutes after the click.

```
agent ──► guarded() ──► manifest: is this sensitive?
                            │
                    low ────┴──── high
                     │             │
                  execute     consume(tool, sha256(args))
                                   │
                        ┌──────────┴──────────┐
                     found                 not found
                        │                     │
                    execute            REFUSE + open dialog
                                              │
                                     user clicks confirm
                                              │
                                        gate.grant(id)
                                   (the only call site in the app)
```

Three properties hold by construction:

- **Sensitivity is fixed at build time.** It is read from `TOOL_MANIFEST` in
  `lib/contracts.ts` and from nowhere else. An agent that passes
  `{sensitivity: 'low'}` changes the fingerprint and nothing else.
- **No tool grants consent.** There is no `approve_action`, no `confirm`, no
  `grant_consent` under any name. `gate.grant` has exactly one call site in the
  entire repository: the `onClick` handler in `components/ConsentDialog.tsx`.
- **The gate fails closed.** Absence of consent means the action does not
  happen. There is no bypass, not even behind a development flag.

### What this does not do

**It does not solve prompt injection.** A compromised model can still choose
which action to ask for, and it can still ask persuasively. The paper says this
plainly and so do we.

What is guaranteed is narrower and worth stating exactly: a sensitive action
never happens silently, consent is bound to one action with one set of
arguments, and it is neither replayable nor transferable. The guarantee lives
outside the model, so a model that misbehaves cannot relax it.

## The seven tools

| Tool | Sensitivity | What it does |
|---|---|---|
| `list_assistants` | low | Lists assistants and their publish state |
| `create_assistant` | low | Creates a draft: name, purpose, tone, language |
| `add_knowledge` | low | Appends a snippet to an assistant's knowledge |
| `test_assistant` | low | Sends one test message, returns the reply |
| `publish_assistant` | **high** | Publishes to a live channel |
| `share_assistant` | **high** | Shares with an external email address |
| `delete_assistant` | **high** | Deletes permanently |

The three sensitive tools are registered **only while at least one assistant
exists**. They appear the moment the first one is created and unregister when
the last one is deleted, which exercises the state dimension of the standard and
emits a real `toolchange` event.

## Run it locally

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

```bash
pnpm test         # vitest run - 18 tests, the gate's contract
pnpm build        # production build
```

## Test it with an agent

The studio registers its tools through `document.modelContext`, which needs a
browser that implements WebMCP:

- **The ChatGPT desktop app's built-in browser** supports WebMCP with no setup.
- **Chrome**: enable `chrome://flags/#enable-webmcp-testing` and restart.
- The **Model Context Tool Inspector** extension lets you see registered tools
  and call them by hand against their JSON Schema.

Then try, in order:

1. *"List my assistants"* — works immediately.
2. *"Build me a formal assistant for a restaurant"* — created, knowledge added,
   tested, without you touching the mouse. Watch the panel: three more tools
   appear the moment the assistant exists.
3. *"Publish it to WhatsApp"* — **refused.** The panel highlights the blocked
   call and a dialog opens. Click confirm and ask again: it publishes.
4. *"Now delete the other assistant"* — refused. The consent you just gave does
   not travel to another action.

WebMCP only works in origin-isolated documents. Do not send an
`Origin-Agent-Cluster: ?0` header; it disables the interface completely.

## Layout

```
app/                     Routes: list, create, assistant detail
  providers.tsx          Mounts the gate, the dialog, the panel, the tool host
components/
  ConsentDialog.tsx      The only place gate.grant is ever called
  AgentPanel.tsx         Registered tools, gate decisions, recent calls
  studio/                The human-facing studio components
lib/
  contracts.ts           FROZEN: manifest, fingerprinting, the guard wrapper
  consent/ledger.ts      The consent ledger, in memory, single-use, TTL
  consent/*.test.ts      18 tests: 4 invariants + 4 supporting + 10 attacks
  tools/register.ts      WebMCP registration, conditional on state
  store.ts               The studio's state
```

State lives in memory. No database, no auth, no `localStorage` for consents:
today's approval must not be usable in tomorrow's session.

`lib/contracts.ts` is read-only by policy. Sensitivity being fixed at build time
is the entire point, so the file that fixes it does not get edited casually.

## The paper

This studio embodies the deterministic guard from *Whose Stranger Is It?*

DOI: [10.5281/zenodo.20847425](https://doi.org/10.5281/zenodo.20847425)

The four gate invariants in `lib/consent/ledger.test.ts` are the same four
tested in the paper (§7.4). WebMCP sharpens the argument: `readOnlyHint` and
`untrustedContentHint` are declared by the page itself — the very party that may
be the adversary — with no signing, no revocation, and no audit levels. That is
where the paper's P1 and P2 assumptions fail in a browser, and it is what this
project addresses.

## Licence

MIT. See [LICENSE](LICENSE).
