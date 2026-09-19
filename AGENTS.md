# Repository instructions

Keep changes narrow, preserve the user's scope, and avoid duplicating guidance.
This file defines repository-wide maintenance conventions; it is not a second
source for forecast-domain or workflow rules.

## Instruction ownership

Every rule must have one canonical owner. Link to that owner instead of
paraphrasing the rule elsewhere.

| Location                                    | Put here                                                                                                                                   | Do not put here                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                                 | Durable repository structure, maintenance conventions, validation commands, and definition of done                                         | Forecast semantics, tool payload details, or copied skill procedures                                  |
| `src/foresight/instructions.md`             | Runtime rules shared by several stages: workflow state, internal metadata, language, common rendering, approval order, recall, and exports | Stage-specific research, drafting, or decision rules; field-by-field schemas                          |
| `skills/<name>/SKILL.md`                    | Concise discovery metadata, prerequisites, minimal workflow, tool order, stop conditions, and links to relevant references                 | Detailed domain policy, long examples, payload schemas, or shared server conventions                  |
| `skills/<name>/references/*.md`             | Stage-specific semantic rules, conditional procedures, detailed formats, and examples that materially clarify decisions                    | Generic agent advice, shared metadata/language rules, or text copied from `SKILL.md` and tool schemas |
| `src/foresight/tools.ts` tool descriptions  | One or two sentences stating tool purpose, important precondition, and side effect                                                         | End-to-end workflow instructions, rendering menus, or skill policy                                    |
| `src/foresight/tools.ts` and schema modules | Field meaning, structural constraints, validation, and machine-enforced invariants                                                         | Prose-only rules that cannot be validated and belong to a skill reference                             |
| `README.md`                                 | Public architecture, setup, commands, and a high-level capability overview                                                                 | A maintained copy of internal workflows or semantic specifications                                    |

When a rule appears to fit several places, choose by scope:

- Cross-stage runtime invariant: server instructions.
- One stage's reasoning or content standard: that skill's reference.
- Skill activation, routing, or short workflow: `SKILL.md`.
- Tool discoverability: tool description.
- Enforceable data invariant: schema or validator.
- Contributor-only maintenance practice: `AGENTS.md`.

## Editing rules

1. Inspect the current owner and its callers before editing. Read only the
   references relevant to the requested change; do not load every skill or
   repository document by default.
2. Change the canonical owner only. If duplicated wording already exists,
   remove it from non-owning files and replace it with a short link or pointer
   when routing is needed.
3. Keep `SKILL.md` as short as the workflow permits. Its frontmatter
   description says what the skill does and when it applies; its body routes the
   workflow and loads detailed references only when needed.
4. Add text only when it changes decisions, prevents a demonstrated failure,
   preserves a non-obvious invariant, or explains how to verify the result.
   Remove generic advice, speculative edge cases, redundant examples, and
   requirements already enforced by code or higher-priority instructions.
5. Match specificity to risk. Prefer outcomes and decision criteria over rigid
   recipes unless correctness, safety, or a fragile protocol requires an exact
   sequence or format.
6. Keep tool descriptions concise and discriminating. Put field details in
   schema descriptions and workflow behavior in skills; do not use tool
   descriptions as backup prompts.
7. Preserve existing terminology and authorization boundaries. A refactor of
   instructions must not silently change workflow behavior, approval order,
   language locking, data shape, or user-visible guarantees.
8. Before finishing, search the affected instruction surfaces for distinctive
   phrases and concepts. Repeated nouns are normal; repeated requirements or
   paragraphs should have one owner.

## Tests and documentation

- Prefer tests for observable behavior, schema invariants, ownership
  boundaries, and useful size limits. Avoid brittle tests that merely pin long
  generated wording, headings, or paragraph copies.
- Update tests when responsibility moves between layers; do not preserve a
  duplicate solely because a wording assertion expects it.
- Add a new reference, script, asset, or document only when it has a concrete
  caller and improves reliability or progressive disclosure. Do not create
  parallel quick-reference documents.
- Keep public documentation high level. Link to the canonical implementation or
  instruction owner instead of restating changing internal details.

## Validation

Run checks proportional to the change:

- Skill changes: validate each changed skill with the installed
  `skill-creator/scripts/quick_validate.py` and confirm every reference is
  linked from its `SKILL.md`.
- TypeScript or schema changes: run `bun run test` and `bun run check`.
- Documentation and instruction changes: run Prettier on the changed files and
  `git diff --check`.
- Review the final diff for accidental expansion, contradictory guidance,
  orphaned references, and unrelated edits.

A change is complete when the requested behavior is preserved or improved,
the rule has one clear owner, non-owning layers contain only the routing they
need, and the relevant validations pass.
