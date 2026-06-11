# Agent Instructions

## Pace of work

Work through [PLAN.md](PLAN.md) one step at a time, in the order listed under "Implementation order".

- Do **only the next logical step**, then stop. A step is usually just one software component at a time, easily digestable by the reviewer — not a whole phase.
- Treat broad plan bullets like "schema layer", "library layer", "CLI", or
  "MCP server" as **groups of many small steps**, not as permission to
  implement the whole group in one turn.
- A normal implementation step should touch only one narrowly scoped concern,
  for example one module plus its direct tests, one failing test, or one
  small refactor. If completing the next plan bullet would require multiple
  modules, choose the smallest useful first module and stop there.
- Before writing code, state the exact small step being taken.
- At the end of each response, ask the user to choose between about three
  concrete directions for the next logical, small step. Keep each option
  reviewable and narrowly scoped. Do not continue into the next step until the
  user chooses one.
- If a step reveals that the plan needs to change, say so and pause rather than silently re-planning several steps ahead.

## Keeping PLAN.md current

If the intent of a prompt is to change the plan, rescope work, or put
something on the roadmap for later consideration, update [PLAN.md](PLAN.md)
to reflect that — don't just act on it in code or hold it in conversation
context. The plan document should stay the source of truth for what's
in scope now versus deferred.

## Goal

Keep each turn small and reviewable. Favor several short turns over one large turn.
