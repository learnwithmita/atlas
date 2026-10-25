# Summary sheets — watermark & access-log disclosure

Draft text to include in Atlas's Terms of Use and/or Privacy Policy before
summary sheets are released to students. Plain-language disclosure is what keeps
the watermark + access log on the right side of privacy expectations (and of
Singapore's PDPA / GDPR where it applies). Not legal advice — have your wording
confirmed for your jurisdiction, especially as users are minors.

---

## One-liner (Terms of Use)

> To protect our study materials, each summary sheet is watermarked with your
> account email and the date you open it, and we keep a short-term record of
> when sheets are opened. Summary sheets are for your personal study only and may
> not be copied, resold or redistributed.

## Short paragraph (Privacy Policy — "How we use your information")

> **Protecting our study materials.** Pro summary sheets are delivered
> individually to you: when you open one, it is stamped with your account email
> and the current date, and we record that the sheet was opened — specifically
> your account, which topic, the time, and a general device label (for example
> "Chrome · iOS"). We do **not** store your IP address or full device details
> for this. We use this information solely to deter and investigate the copying
> or sharing of our materials — never to profile your study activity or for
> marketing — and we delete these records after 90 days. The records are
> accessible only to Atlas administrators.

## What is actually collected, and why

| Field | Collected? | Why |
|---|---|---|
| Account email (on the image) | Yes — shown only to that student | Makes each copy self-identifying if shared |
| User ID | Yes (log) | Ties a leaked sheet to an account |
| Topic | Yes (log) | Which sheet was opened |
| Timestamp | Yes (log) | When it was opened |
| Coarse device (e.g. "Chrome · iOS") | Yes (log) | Distinguish sessions without identifying the device |
| IP address | **No** | Not needed for leak-tracing; higher privacy cost |
| Full user-agent | **No** | Coarse label is enough |

- **Purpose limitation:** anti-piracy / abuse investigation only.
- **Retention:** 90 days, then purged (app-enforced; optional pg_cron job too).
- **Access:** admin-only (enforced by row-level security on `summary_views`).
- **Minors:** as students are typically minors, confirm any parental-notice /
  consent requirements for your jurisdiction before launch.
