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
missing facts. Use `request_user_input_async` to ask which candidate terms the
user wants defined; present the recommended selection and an explicit no-terms
choice, and allow a free-form selection. Do not invent terms or force a
definition when none is materially ambiguous. After the user's choice, show the
selected term-to-definition map in text chat, including an empty map when the
user chose none. Iterate there until the user explicitly approves the
exact map for entry. Only then submit it; the server-wide workflow records that
chat approval and opens Bleavit Foresight with the approved map for review.
