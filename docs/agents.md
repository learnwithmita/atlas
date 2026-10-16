# Atlas Agent System: Full Spec

Oct 16, 2026 · @mita

Atlas runs on 15 agents in pairs: every agent that makes content has a checker, and an orchestrator runs them topic by topic. You only see what fails a check. One topic flows from research, to a study guide, to questions and images, to a long-form video for Atlas.

## At a glance

| # | Agent | Job | Checked by |
| --- | --- | --- | --- |
| 1 | Orchestrator | Runs every step for a topic, in order, and retries or escalates | You (review inbox) |
| 2 | Research agent | Collects syllabus, textbook-level facts and paper questions into the knowledge base | Content validator |
| 3 | Exam-trend agent | Finds what past papers test again and again, and how marks are given | Content validator |
| 4 | Study-guide agent | Writes one go-to guide per topic, answering every learning outcome | Content validator |
| 5 | Content validator | Cross-checks the guide against research and the syllabus | Spot checks + student reports |
| 6 | Paper extractor | Pulls questions, marks and figure positions from uploaded papers, for research | Exam-trend agent |
| 7 | Diagram cropper | Cuts diagrams out of papers you have rights to | Answer checker |
| 8 | Question generator | Writes original questions that test the same concepts, in the same exam style | Originality checker |
| 9 | Originality checker | Rejects questions too close to any source paper | Spot checks |
| 10 | Solver A and Solver B | Answer each question independently | Answer checker |
| 11 | Answer checker | Compares solvers, recomputes numbers, checks against answer keys | Spot checks |
| 12 | Image agent | Draws diagrams for generated questions, failed crops and study guides | Image label checker |
| 13 | Image label checker | Reads labels back and retries garbled images | Spot checks |
| 14 | Video agent | Turns a verified guide into a long-form topic video for Atlas, styled from your sample reel | Video checker |
| 15 | Video checker | Checks on-screen text, syllabus alignment and readability | You, before it goes live |

&#91;embedded content: agent system · 2 lanes, 5 checkers\]

Two lanes run per topic: notes and video on the left, the question bank on the right. Videos start only after the study guide passes validation, and questions are written fresh from the exam trends, not copied from papers.

## Shared rules

Every agent follows the same four rules, so the system stays checkable as it grows.

1. **The syllabus is the anchor.** Every fact, question, guide section and video scene is tagged with the learning-outcome code it serves. Content that maps to no outcome is cut. Atlas already stores topics, subtopics and learning outcomes, so this is the spine.
2. **Every item has a status:** draft, auto-verified, needs review, approved or rejected. Students see only auto-verified or approved content. Instagram posts need approved.
3. **Every claim keeps its source.** The knowledge base stores where each fact came from (syllabus PDF and page, textbook page, paper and question number). Checkers compare against sources, not against another model's memory.
4. **Checkers don't fix, they flag.** A checker returns pass or fail with a reason. The maker agent retries up to 3 times; after that the item goes to your review inbox with the reason, such as "LO 4.2 not covered" or "on-screen text says 'mitochondira'".

**Knowledge base:** one store per topic holding syllabus outcomes, sourced facts, exam-trend findings, the study guide, questions with answers, images and videos. All agents read from it and write back to it, so nothing depends on a chat's memory.

## 1. Orchestrator

The orchestrator takes one topic and runs every agent in order, starting each step only when the previous one has passed its check.

**Order for one topic:**

1. Research agent and exam-trend agent (can run side by side).
2. Study-guide agent, then content validator. Stop here if the validator fails three times.
3. Question generator and originality checker, then image agent for any diagrams, then Solver A and B and the answer checker.
4. Image agent and label checker, only for gaps left by step 3 or images the guide asks for.
5. Video agent, then video checker: one long-form video per topic.
6. Publish what passed; put the rest in your review inbox.

**How it runs:** each step is a job in a queue, not one long request, because Atlas's server routes time out after 1 to 5 minutes. The orchestrator records each step's status, so a failed step can be re-run without redoing the whole topic.

**When it stops for you:** a checker fails three times, sources disagree on a fact, or a topic has no learning outcomes loaded yet.

## 2. Research agent and exam-trend agent

These two fill the knowledge base so the study guide is built from sources, not from a model's memory.

**Important syllabus change:** from 2027, O-Level, N(A) and N(T) are combined and renamed the Singapore-Cambridge Secondary Education Certificate (SEC), with subjects at G1, G2 and G3. G3 uses the O-Level grading scale. The science syllabuses have new codes, so the agent must load the right one ([SEAB: SEC](https://www.seab.gov.sg/secondary-education-certificate-sec/), [2027 G3 syllabuses](https://www.seab.gov.sg/secondary-education-certificate-sec/g3-syllabuses-for-school-candidates-2027/)).

| Subject | 2027 SEC code | Code for 2026 and earlier |
| --- | --- | --- |
| Biology | K325 | 6093 |
| Chemistry | K324 | 6092 |
| Science (Chemistry, Biology) | K328 | 5088 |

**Research agent**

- **Reads:** the official SEAB syllabus PDF (the ground truth), then supporting sources: open educational material, freely published school prelim papers, and textbooks you own. It reads them to understand; it never copies passages into Atlas.
- **Writes:** for each learning outcome, a short list of facts, definitions, required diagrams and practical skills, each with its source.
- **Flags:** facts that sources disagree on, and anything taught in textbooks but not in the syllabus (marked "beyond syllabus" so guides leave it out).

**Exam-trend agent**

- **Reads:** paper questions already in Atlas's question bank, plus any past papers and mark schemes you are licensed to use.
- **Finds:** which outcomes are tested most often, the command words used (state, explain, describe, suggest, calculate), the keywords mark schemes reward, and common ways students lose marks.
- **Writes:** a frequency score per learning outcome (high, medium, low) and an "examiner wants" list per outcome, for example: "osmosis answers must say water potential and partially permeable membrane".

SEAB sells past-year papers through authorised publishers rather than releasing them free ([SEAB](https://ask.gov.sg/seab/questions/cm1ugigk1004xux9s59k80j0k)). The trend agent can analyse papers you've bought, but Atlas should show students its own questions, not reproduced SEAB papers (see Risks).

## 3. Study-guide agent

The study-guide agent writes one go-to guide per topic: in-depth on what is examined, silent on what isn't. It reads only the knowledge base (research facts and exam trends), never its own memory.

**Each guide follows the same structure:**

1. **Topic at a glance:** 3 to 5 lines on what the topic is about and how often it is tested.
2. **One section per learning outcome**, in syllabus order, each with:
   - The outcome as written in the syllabus.
   - The answer: what the student must know, in exam-ready wording.
   - Keywords the mark scheme rewards, in bold.
   - A required diagram, if the outcome needs one.
   - "Examiner wants" and "common mistakes" lines from the exam-trend agent.
3. **High-frequency box:** the outcomes tested most often, so students know where to spend time.
4. **Exam technique:** how to answer this topic's common command words, with one worked model answer.
5. **Quick self-test:** 5 to 8 short questions linked to the question bank.

**Rules that keep it useful, not long:**

- Every sentence must serve a learning outcome; anything marked "beyond syllabus" is left out.
- Depth follows frequency: high-frequency outcomes get worked examples, low-frequency ones get the essentials.
- Wording matches mark-scheme language, so students learn the phrasing that earns marks.

The guide replaces today's notes (key points and misconceptions) in Atlas's topic notes page.

## 4. Content validator

The content validator checks the study guide against both the research and the syllabus, using a different model from the one that wrote the guide, so mistakes aren't repeated.

**Checks, in order:**

1. **Coverage:** every learning outcome has a section that answers it, with the line quoted. Result: a score such as "12/12 outcomes covered".
2. **Accuracy:** every factual sentence traces back to a sourced fact in the knowledge base. A sentence with no source is flagged "unsupported", even if it sounds right.
3. **Scope:** nothing beyond the syllabus slipped in.
4. **Exam fit:** the keywords from the exam-trend agent appear in the matching sections.
5. **Readability:** short sentences, defined terms, no padding.

**Result:** pass, or a list of exact fixes sent back to the study-guide agent ("LO 3.2 missing", "sentence 4 in LO 1.1 unsupported"). After 3 failed attempts, the guide goes to your review inbox.

## 5. Question bank agents

These agents fill the question bank with original questions in real exam style, each with a verified answer. Source papers are used to learn what is tested and how, never shown to students as they are.

- **Paper extractor:** reads uploaded papers (SEAB, school prelims, assessment books) and records each question's concept, learning outcome, command words, marks and question style. This feeds the research and exam-trend agents; extracted questions are not published.
- **Question generator (new):** for each learning outcome, writes new questions using Gemini, guided by the exam-trend findings: the concept tested, the command word, the mark allocation and the typical structure (for example, a 3-mark "explain" on osmosis with a data table). It changes the context, organism, numbers and wording, and asks the image agent for any diagram. It aims for the same mix of difficulty and question types as real papers.
- **Originality checker (new):** compares every generated question against all source questions in the knowledge base. Questions whose wording, data or scenario are too close to a source are rejected and regenerated. It also checks the question is answerable, matches its marks and stays within the syllabus.
- **Solver A and Solver B:** two different models answer each question without seeing each other's answer. Each writes a model answer and mark-scheme points.
- **Answer checker:** passes the answer when both solvers agree and the number of mark points matches the marks. For calculations (moles, concentration), it recomputes the numbers in code. Disagreements go to your review inbox with both answers side by side.
- **Diagram cropper:** kept for papers you have rights to use, such as your own worksheets. For SEAB and school papers, diagrams are redrawn by the image agent instead.

## 6. Image agent and label checker

Images are generated for new questions, failed crops and study-guide diagrams, using the image models Atlas already calls, so Google Flow is no longer needed.

- **Image agent:** draws the diagram and also writes down the labels it should contain, for example nucleus, cell membrane and cytoplasm.
- **Label checker:** a vision model reads the finished image and compares what it sees against that list. Misspelled, garbled, missing or wrong labels trigger a retry, up to 3 attempts, then the image goes to your review inbox.

## 7. Video agent

The video agent turns a verified study guide into one long-form video per topic for Atlas. You provide a sample one-minute reel, and the agent uses it as the base for how the animation and visuals should look, restyled to match the Atlas website. It starts only once the guide has passed the content validator, so videos never teach unverified content.

**The key design choice: fixed templates, changing content.** Instead of designing every video from scratch, the agent fills a small set of scene templates with new text. This keeps the look the same across every video, which is easier for students to read and keeps on-screen text exact.

**Style file (set once, from your sample reel):**

- **Kept from your sample reel:** animation style, transitions, text layout, font sizes and pacing, so the visuals stay familiar and easy to read.
- **Restyled to Atlas:** ink text on a light background, the single indigo accent, amber only for highlights, and the same fonts as the website.
- **Voice:** the same voice as the sample for narration.
- **Frame:** 16:9 for watching on Atlas, with the reel's vertical layout adapted to landscape.

**Scene templates:** title card, learning-outcome card, definition with keywords highlighted, labelled diagram, step-by-step process, "examiner wants" card, common-mistake card, worked exam question, recap.

**Steps:**

1. **Script:** one segment per learning outcome, written from the guide. Each segment lists its scenes and the narration line for each.
2. **Scene list:** a structured file that names the template, the exact on-screen text and the diagram for each scene. This file is what the checker reads.
3. **Render:** the templates are drawn from that file in code and exported to MP4. Building it as React code (for example, with Remotion) fits Atlas's existing stack.
4. **Voice and captions:** narration in the same voice, with captions generated from the script.

**Long-form length:** about 2 to 3 minutes per learning outcome, split into chapters by outcome, so a student can jump straight to the part they need.

## 8. Video checker

The video checker checks the video twice: the scene list before rendering, and the finished video after, because errors can creep in at either step.

**Before rendering (scene list):**

- Every on-screen line and narration line matches the verified study guide word for word, or is a faithful shortening of it.
- Spelling, chemical formulas, units and state symbols are correct (for example, H₂SO₄, cm³, mol/dm³).
- Each segment is tagged with a learning outcome, and every high-frequency outcome is covered.

**After rendering (the MP4):**

- Frames are sampled every few seconds and read back with a vision model: text must match the scene list, with nothing cut off, overlapping or too small to read on a phone.
- Captions are compared against the narration script.
- Timing: each text card stays on screen long enough to read (about 3 words per second as a guide).

**Result:** pass, or exact fixes sent back to the video agent. You give each video a final look before it goes live on Atlas.

## 9. Publishing: Atlas and Instagram

Long-form videos go into Atlas for students. Your one-minute reels stay a separate channel on Instagram, bringing students to your tutoring.

**In Atlas (to build):**

- A video upload in the admin area that attaches a video to a topic, plus chapter markers per learning outcome.
- A "Watch" tab on each topic's notes page, next to the study guide.
- Later, the orchestrator uploads approved videos itself, so the manual upload becomes a fallback.

**On Instagram:**

- Reels end with a clear call to action, for example "DM 'BIO' to book a tutoring slot".
- Captions repeat the key points, so the reel works with the sound off.
- Keep a simple log of which reel led to which DM, so you know which topics bring students.

Atlas Pro could include the full long-form library, while reels stay free. That gives Instagram viewers a reason to try Atlas as well as to book tutoring.

## 10. Risks

| Risk | What to do |
| --- | --- |
| Copyright on SEAB papers, school papers and textbooks | Use them only as research: the question generator learns concepts and style, then writes original questions, and the originality checker rejects anything too close to a source. Never publish source questions, diagrams or textbook passages. SEAB papers are sold, not free. This is a general approach, not legal advice; a short check with an IP lawyer before launch is worth it. |
| Wrong content reaching students | Nothing goes live without passing a checker; spot-check 5% of auto-verified items; add a "report a problem" button. |
| Outdated syllabus | Tag every item with the syllabus code and year; re-run the coverage check when SEAB publishes a new syllabus. |
| Students and minors on Instagram | No student faces or names without parental consent; reply to DMs from your tutoring account, not a personal one. |
| AI costs growing | Generate each topic once and store it; re-render only what changed. Long-form video rendering is the most expensive step, so run it only after the guide is approved. |

## 11. Build order and how to run this in Claude Code

**Build order:** each step is useful on its own, so you get value before the whole system exists.

1. **Knowledge base and statuses:** tables for sourced facts, trend findings and item status, plus the review inbox.
2. **Research, exam-trend, study-guide and content validator agents:** the study guide is the foundation everything else builds on.
3. **Question generator, originality checker and dual-solver answer checking** for the question bank.
4. **Video agent and video checker:** starting from your sample reel's style.
5. **Video upload in Atlas** and the Watch tab.
6. **Orchestrator:** one "Build topic" button once the pieces work individually.

**Same chat or a new one?** Keep working in the same Claude Code project, but don't rely on the chat's memory. Put the context in files, so any chat can pick it up:

- Save this spec in the repo as `docs/agents.md`, and add one line to `CLAUDE.md` pointing to it. Claude Code reads `CLAUDE.md` at the start of every chat.
- Start a fresh chat for each build step above, opening with: "Read docs/agents.md, then build step 2." Fresh chats stay focused; very long chats lose track of early details.
- When a step is finished, ask Claude Code to update `docs/agents.md` with what was built, so the next chat starts from the truth.

**A faster first version:** before building agents into the app, you can run the research, study-guide, validator and video agents as Claude Code subagents on your laptop, saved as files in the repo's `.claude/agents` folder. You trigger them per topic, review the output, and import it into Atlas. Once the prompts and checks work well, move them into Atlas as automated jobs.

## Sources

- [SEAB: Secondary Education Certificate (SEC)](https://www.seab.gov.sg/secondary-education-certificate-sec/)
- [SEAB: 2027 SEC G3 syllabuses for school candidates](https://www.seab.gov.sg/secondary-education-certificate-sec/g3-syllabuses-for-school-candidates-2027/)
- [SEAB on ask.gov.sg: past years' question papers](https://ask.gov.sg/seab/questions/cm1ugigk1004xux9s59k80j0k)
