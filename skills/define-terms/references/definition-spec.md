# Definition specification

Identify only words or phrases that a reasonable forecast user could interpret
in materially different ways. Common cases are ambiguous verbs, named entities,
measurement conventions, indexes, jargon, or quantities whose methodology is
unclear. Do not define obvious words, sources, resolution authorities,
reporting entities, deadlines, or observation periods that belong to later
stages.

When variables are present, analyze the common wording and full value set without choosing or instantiating a
value. For a conditional unit, analyze both the condition statement and outcome
question; do not redefine the unmet disposition.

Each definition is neutral, dispute-resistant, and at most two sentences.
Cite an authoritative methodology only when needed to fix meaning. Never guess
missing facts. When the user must choose among materially different defensible
definitions, present the alternatives with `request_user_input_async`,
recommend one with a brief reason, and leave room for a free-form answer. Return
a term-to-definition map after the choice; an empty map is valid.
