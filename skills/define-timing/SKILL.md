---
name: define-timing
description: Propose and obtain approval for the event deadline or observation window, trading interval, and expiration datetime of a selected prediction-market unit before defining terms or resolution sources.
---

# Purpose

Use this skill after exactly one display-question unit has been selected and
explicitly approved, and before `define-terms` or
`define-resolution-source`. It establishes the timing boundaries the later
workflows must use; it does not define ambiguous non-temporal terms or choose
resolution sources.

Read [references/timing-spec.md](references/timing-spec.md) before proposing
timing. That reference contains the canonical definitions, timestamp rules,
proposal shape, and approval guard.

## Workflow

1. Confirm that the input contains the exact selected unit and its 1-based unit
   number, and that the selected-unit approval has already been recorded. If
   the unit is missing, ambiguous, or still pending, stop and return to the
   selection handoff.
2. Determine whether the unit is a point-in-time/occurrence event or a
   measurement. Derive the event deadline, resolution deadline, or observation
   end from the display question when it is explicit. For a measurement, also
   determine the observation start. Always prepare a complete, clearly
   provisional proposal for every timing field, including values that are not
   explicit in the question. Ground suggested values in the event context and
   state the assumptions so the user can review and correct them. Do not treat
   a suggested date, clock time, time zone, boundary rule, or publication rule
   as approved until the user confirms it.
3. Prepare one complete timing proposal containing:
   - the event deadline for a point-in-time event, or the observation start and
     observation end for a measurement;
   - the exact UTC timestamps, the named IANA time zone, and an inclusive or
     exclusive boundary rule;
   - whether occurrence time, qualifying publication time, or both control;
   - a suggested trading start and end; and
   - a suggested expiration date and time.

   Use the canonical definitions and timestamp representation in the
   reference every time. Suggest a trading end before the event deadline or
   observation end so trading does not continue while the result is being
   determined. Suggest expiration after the relevant evidence is expected to
   be published when a later publication or review is reasonably necessary.
   Present this complete proposal to the user in the canonical format and ask
   whether it is correct. Do not call an MCP tool for the proposal: this skill
   owns the conversational proposal, revision, and explanation loop. If an
   assumption is weak or the event context cannot support a defensible value,
   label it as unresolved inside the proposal and ask the user to correct it;
   do not stop without showing the remaining fields.
4. If the user requests a change, revise the complete proposal and present it
   again. Do not silently accept partial or implied approval. When the user
   confirms the proposal, call `submit_timing` once with the carried
   `contract_id`, exact selected unit, unit number, and the complete final
   timing fields. Present the tool's complete returned Markdown faithfully,
   translating renderer-generated English labels and other fixed UI text into
   the user's language while preserving all timing data. The user's
   confirmation of the conversational proposal is the timing approval, so call
   `approve_event_contract` immediately afterward with the same `contract_id`
   and `stage: "timing"`; do not ask for a second timing approval.
5. After the timing-stage approval succeeds, preserve the exact approved timing
   and pass it unchanged to `define-terms` and then to
   `define-resolution-source`.
6. If later source review shows that a source's publication schedule cannot
   satisfy the approved timing, return to this skill, explain the conflict,
   propose the smallest necessary timing change, and obtain approval again
   before continuing.

## Boundaries

- Do not proceed to term definition or source selection while timing is only
  proposed and not explicitly approved.
- Do not redefine the selected question or change its unit number.
- Do not treat last trading time as the event deadline, or expiration as proof
  that the underlying event occurred.
- Do not define settlement calculations, source precedence, methodology, or
  correction rules here; those belong to later contract-definition steps.
- Do not call `submit_timing` until the user confirms the conversational
  proposal. Immediately follow it with `approve_event_contract` at
  `stage: "timing"`; do not request a second approval for the submitted
  timing. `submit_timing` stores pending timing and the immediately following
  approval tool promotes it into approved contract memory.
