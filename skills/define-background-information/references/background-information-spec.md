# Context and background specification

Help an informed non-specialist understand the event without predicting it or
changing its approved interpretation.

The `background_information` value contains relevant durable historical,
institutional, procedural, or domain context as plain text, without a nested
heading or additional fields.

When the significance is not obvious, explain factually why the topic matters
to readers' forecasts. Give an informed non-specialist enough context to get
started; about 120 words is a useful target for unfamiliar or complex topics,
but do not pad straightforward ones. Link every non-obvious factual claim to
direct supporting information; always include links for figures, quotations,
and historical facts.
Anchor time-sensitive facts and figures to the date or period they describe;
avoid unanchored terms like “currently.”

Prefer authoritative primary sources for institutional facts and reputable
secondary sources when they materially improve explanation. Describe disputed
claims accurately. Attribute copied material to its source with a direct link.
Mark verbatim quotations clearly, preferably with `>`; when reusing another
question's background, identify and link that question without requiring a
blockquote. Keep background and resolution criteria separate:
include no resolution details in the background; the criteria must contain
everything needed to resolve the question. Do not advocate, offer trading
advice, claim an outcome, or include transient status/news updates. Keep the
exact forecast question unit and every approved upstream stage unchanged.

Use `request_user_input_async` before research when the desired context needs
material clarification, such as focus, audience, or requested inclusions and
exclusions. Then draft the complete background in text chat. Ask whether the
user approves it or wants changes, iterate in chat, and ask again after each
revision. Only after the user explicitly approves the exact text for
entry should it be submitted. The server-wide workflow records that approval
and opens Bleavit Foresight with the approved background for review.
