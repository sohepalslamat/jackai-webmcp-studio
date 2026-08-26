# Assistant Studio — WebMCP Challenge submission

**Live:** https://studio.jack-ai.net
**Repository:** public, MIT
**Paper:** [10.5281/zenodo.20847425](https://doi.org/10.5281/zenodo.20847425)

---

## 1. Why this use case is a good fit for WebMCP

Building an assistant is long, iterative, unglamorous work. You write a purpose,
paste in knowledge, test it, notice the tone is wrong, fix it, test again. An
agent is good at that loop. A person has the taste to judge the result.

That alone would make it a reasonable WebMCP demo. What makes it the right one
is what happens at the end of the loop: the output gets published to customers,
shared with colleagues, or deleted. Those actions are visible to other people or
cannot be undone, and they must not happen because a model decided they should.

So this is a workspace where the collaboration is genuinely useful *and* the
boundary genuinely matters. Most agent demos have one or the other. The
interesting engineering is in having both at once, which means the page has to
hand an agent real capability while keeping a hard limit the agent cannot reach
past.

## 2. How it improves the user experience

Before: creating one assistant is four screens and about ten clicks. Filling a
knowledge base is copy, paste, save, repeat.

After: one sentence to the agent, and the interface moves in front of you. You
watch an assistant appear in the list, knowledge land in its panel, a test reply
come back. You are not reading a transcript of what an agent claims it did — you
are watching your own application change.

The agent does not replace the interface. It shares it. Every screen still works
by hand, and a person who ignores the agent entirely loses nothing.

At the boundary the experience inverts on purpose. When the agent asks to
publish, the studio stops and shows you the exact action in your own language —
"نشر «Cafe Bot» على قناة whatsapp" — composed by the application from the
arguments, never phrased by the model. The friction is the feature, and it
appears at precisely three places out of seven.

## 3. What is now possible that was not before

An agent that builds another agent, with a person watching it happen live rather
than reviewing it afterwards, and with a limit that holds regardless of what the
model decides.

Concretely: publish, share and delete cannot occur without a click made at that
moment, on that action, with those arguments. One approval never becomes two.
An approval for one assistant never moves to another. An approval for publishing
never becomes a deletion.

This is the part that did not exist before, and it is not a matter of a
well-written system prompt. The manifest is fixed at build time, the fingerprint
is SHA-256 over canonicalised arguments, and the ledger is written by exactly one
`onClick` handler. A model that is confused, jailbroken, or actively hostile
meets the same wall as a model that is behaving.

## 4. How WebMCP was implemented

Seven tools registered through `document.modelContext.registerTool`, each with a
precise JSON Schema and `enum` constraints wherever the value space is closed, so
the model guesses less.

**Lifecycle.** Registration is bound to component lifetime with `AbortSignal`.
The WebMCP registry is a single global keyed by tool name, so two concurrent
registrations do not compose — the second overwrites the first, and the first's
teardown then unregisters the survivor. Registration is refcounted per document
to make React's double-mount safe.

**State-dependent tools.** The three sensitive tools are registered only while at
least one assistant exists. They appear on the first create and unregister when
the last is deleted, emitting a real `toolchange` event. A tool that has no valid
target does not exist.

**The guard.** Every `execute` is wrapped by `guarded()`. It reads sensitivity
from `TOOL_MANIFEST` — never from the arguments, never from the model — and for
sensitive tools it requires a consent bound to the tool name and to
`SHA-256(tool ‖ NUL ‖ canonical(args))`. Missing consent means the function is
never called, and the agent receives a refusal explaining that a dialog is now
open and that it cannot grant this itself.

**The ledger.** In memory, single-use, 120-second TTL, no `localStorage`:
yesterday's approval must not be usable today. It exposes `consume` to tools and
`grant` to the interface, and `grant` has one call site in the whole repository.

**Honesty.** This does not solve prompt injection, and the paper it comes from
says so explicitly. The guarantee is narrower: no sensitive action happens
silently, and consent is contemporaneous, single-use, and non-transferable. The
guarantee holds outside the model, which is the only place it can hold.

---

## Verification

18 tests, run with `pnpm test`.

The four invariants from §7.4 of the paper:

1. A sensitive action without consent is dropped, and nothing executes.
2. The same action with matching consent executes.
3. Consent for one action does not pass another — not a different tool, not
   different arguments.
4. A consumed consent does not replay.

Ten adversarial tests assume a hostile model rather than a careless one: twenty
hammered calls yield one dialog rather than twenty, reordered argument keys
cannot buy a second execution, expiry is checked at the millisecond on both
sides, a guessed hash fails without burning a legitimate consent, and
sensitivity passed as an argument changes nothing.

All four invariants were also verified end-to-end in a browser against a live
WebMCP registry, not only at the unit level.
