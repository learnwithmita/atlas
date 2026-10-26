# Notes template (standard skeleton)

Every topic's in-depth notes follow this structure and these conventions, so the
app reads consistently for students. Copy this skeleton when writing a new topic.

## Structure (in this order)

```
# [Topic name]

**Topic at a glance.** 2–4 sentences: what the topic is, why it matters, and the
kind of questions examiners ask.

![short alt](../diagrams/<topic>/<overview-diagram>.png)   ← if there is a key diagram

---

## [1a — subtopic] ... ## [1b — subtopic] ...
Content: definitions in exam wording, labelled diagrams, tables, worked detail.
Bold the keywords the mark scheme wants. Use blockquotes for a memory hook.

---

## Exam technique
- 3–5 short bullets on command words and how to structure answers.

## Common mistakes to avoid
- 3–5 bullets of the usual errors.

## Sample questions and model answers
**How to approach these questions.** One short paragraph (command words, the
answer structure, exact terms). Appears ONCE, at the top of this section.

**Question 1.** <question> **[N]**

*Answer:* <answer, with (1) after each mark-earning phrase>

**Question 2.** ...

*Answer:* ...

---

## Quick self-test
1. ... *(subtopic ref)*

<!-- coverage: 1a, 1b, ... -->
```

## Mark-scheme convention (standardised)

- Show where marks are awarded with an **inline bracket `(1)`** placed straight
  after the phrase that earns it. Do **not** mix styles (no "— 1 mark" hyphen
  form, no "(1 + 1)"). One style everywhere.
- Example: `Cell wall (1); made of cellulose, it gives shape and support (1).`
- Put the **question first, then its answer** (`*Answer:*`). Never list all the
  questions first and all the answers after.
- Keep "how to approach" as a single intro to the sample-questions section, not
  repeated per question.

## Image convention

- Keep alt text **short** (a few words). It is only shown if the image fails to
  load, so it must never be a long sentence.
- Diagrams are served from `/public/notes/<topic>/…`; the markdown uses the
  repo path `../diagrams/<topic>/…` and the upload rewrites it.
