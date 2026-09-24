# Definition specification

Identify only words or phrases that a reasonable forecast user could interpret
in materially different ways. Common cases are ambiguous verbs, named entities,
measurement conventions, indexes, jargon, or quantities whose methodology is
unclear. Do not define obvious words, sources, resolution authorities,
reporting entities, deadlines, or observation periods that belong to later
stages.

Keep the entire selected unit unchanged. When variables are present, analyze
the common wording and full value set without choosing or instantiating a
value. A selected source-review alternative uses its supplied unit and number,
starts with no inherited definitions, and returns to source review afterward.

Each definition is neutral, dispute-resistant, and at most two sentences.
Cite an authoritative methodology only when needed to fix meaning. Never guess
missing facts. When the user must choose among materially different defensible
definitions, ask two or three choices using `1.A`, `1.B`, and so on. Return a
term-to-definition map; an empty map is valid.

Ask which unit is intended when selection is ambiguous; never reconstruct a
missing unit or number from memory.
