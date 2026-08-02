import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toGrade } from "@/lib/utils";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "student" | "tutor" | "admin";
  level: string | null;
  xp: number;
  current_streak: number;
  longest_streak: number;
  daily_goal_xp: number;
  last_active_date: string | null;
};

export type OutcomeMastery = {
  outcomeId: string;
  statement: string;
  code: string | null;
  frequency: number;
  mastery: number;
  confidence: number;
  attempts: number;
  subtopic: string;
  topic: string;
  topicId: string | null;
  subject: string;
};

export type StudyBucket = {
  key: "fix_first" | "high_priority" | "low_hanging";
  title: string;
  blurb: string;
  items: OutcomeMastery[];
};

export type DailyActivity = { day: string; xp: number; minutes: number };

export type StudentDashboard = {
  profile: Profile | null;
  overallMastery: number;
  predictedGrade: string;
  readiness: number;
  outcomes: OutcomeMastery[];
  buckets: StudyBucket[];
  activity: DailyActivity[];
  hasData: boolean;
};

export type Classroom = {
  id: string;
  name: string;
  invite_code: string;
  subject: string | null;
  memberCount: number;
  created_at: string;
};

/** Classrooms owned by the current tutor, with member counts. */
export async function getTutorClassrooms(): Promise<Classroom[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("classrooms")
    .select(
      "id, name, invite_code, academic_year, subject:subjects(name), classroom_members(count)"
    )
    .eq("tutor_id", user.id)
    .order("academic_year", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    invite_code: c.invite_code,
    subject: c.subject?.name ?? null,
    memberCount: c.classroom_members?.[0]?.count ?? 0,
    created_at: c.academic_year ?? "",
  }));
}

// ── Question bank ────────────────────────────────────────────────────────────
// ── Practice review / history ────────────────────────────────────────────────
export type PracticeLogItem = {
  id: string;
  topic: string | null;
  stem: string;
  marks: number | null;
  answer: string | null;
  awarded: number | null;
  awardedPoints: string[];
  missingPoints: string[];
  modelAnswer: string | null;
  improvedAnswer: string | null;
  feedback: string | null;
  createdAt: string;
};

export async function getPracticeHistory(limit = 50): Promise<PracticeLogItem[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("practice_log")
    .select(
      "id, stem, marks, answer, awarded, awarded_points, missing_points, model_answer, improved_answer, feedback, created_at, topic:topics(name)"
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    topic: r.topic?.name ?? null,
    stem: r.stem,
    marks: r.marks,
    answer: r.answer,
    awarded: r.awarded,
    awardedPoints: r.awarded_points ?? [],
    missingPoints: r.missing_points ?? [],
    modelAnswer: r.model_answer,
    improvedAnswer: r.improved_answer,
    feedback: r.feedback,
    createdAt: r.created_at,
  }));
}

// ── Gamification ─────────────────────────────────────────────────────────────
import type { GamiStats } from "@/lib/gamification";

export async function getGamification(): Promise<GamiStats> {
  const empty: GamiStats = {
    xp: 0,
    currentStreak: 0,
    longestStreak: 0,
    attempts: 0,
    fullMarks: 0,
    maxMastery: 0,
    submissions: 0,
    cardReviews: 0,
  };
  if (!isSupabaseConfigured) return empty;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [profile, attemptRows, mastery, subs, reviews] = await Promise.all([
    supabase.from("profiles").select("xp, current_streak, longest_streak").eq("id", user.id).single(),
    supabase.from("attempts").select("awarded_marks, max_marks").eq("student_id", user.id).limit(2000),
    supabase.from("mastery").select("mastery_score").eq("student_id", user.id).order("mastery_score", { ascending: false }).limit(1),
    supabase.from("assignment_submissions").select("assignment_id", { count: "exact", head: true }).eq("student_id", user.id).eq("status", "submitted"),
    supabase.from("flashcard_reviews").select("flashcard_id", { count: "exact", head: true }).eq("student_id", user.id),
  ]);

  const attempts = attemptRows.data ?? [];
  const fullMarks = attempts.filter(
    (a) => a.max_marks != null && Number(a.awarded_marks) >= Number(a.max_marks)
  ).length;

  return {
    xp: profile.data?.xp ?? 0,
    currentStreak: profile.data?.current_streak ?? 0,
    longestStreak: profile.data?.longest_streak ?? 0,
    attempts: attempts.length,
    fullMarks,
    maxMastery: Math.round(Number(mastery.data?.[0]?.mastery_score ?? 0)),
    submissions: subs.count ?? 0,
    cardReviews: reviews.count ?? 0,
  };
}

// ── Flashcards ───────────────────────────────────────────────────────────────
export type FlashcardDeck = {
  subtopicId: string;
  subtopicName: string;
  topic: string;
  subject: string;
  total: number;
  due: number;
};

export async function getFlashcardDecks(): Promise<FlashcardDeck[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cards } = await supabase
    .from("flashcards")
    .select("id, subtopic:subtopics(id, name, topic:topics(name, subject:subjects(name)))");

  const dueByCard = new Map<string, boolean>();
  if (user) {
    const { data: reviews } = await supabase
      .from("flashcard_reviews")
      .select("flashcard_id, due_at")
      .eq("student_id", user.id);
    const now = Date.now();
    for (const r of reviews ?? [])
      dueByCard.set(r.flashcard_id, new Date(r.due_at).getTime() <= now);
  }

  const decks = new Map<string, FlashcardDeck>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (cards ?? []) as any[]) {
    const st = c.subtopic;
    if (!st) continue;
    const d =
      decks.get(st.id) ??
      ({
        subtopicId: st.id,
        subtopicName: st.name,
        topic: st.topic?.name ?? "",
        subject: st.topic?.subject?.name ?? "",
        total: 0,
        due: 0,
      } as FlashcardDeck);
    d.total += 1;
    // New (no review row) counts as due.
    if (!dueByCard.has(c.id) || dueByCard.get(c.id)) d.due += 1;
    decks.set(st.id, d);
  }
  return [...decks.values()].sort((a, b) => b.due - a.due);
}

export type StudyCard = { id: string; front: string; back: string; isNew: boolean; due: boolean };

export async function getStudyCards(
  subtopicId: string
): Promise<{ subtopicName: string; cards: StudyCard[] }> {
  if (!isSupabaseConfigured) return { subtopicName: "", cards: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: st } = await supabase
    .from("subtopics")
    .select("name")
    .eq("id", subtopicId)
    .single();

  const { data: cards } = await supabase
    .from("flashcards")
    .select("id, front, back")
    .eq("subtopic_id", subtopicId);

  const reviewByCard = new Map<string, number>();
  if (user) {
    const { data: reviews } = await supabase
      .from("flashcard_reviews")
      .select("flashcard_id, due_at")
      .eq("student_id", user.id);
    for (const r of reviews ?? [])
      reviewByCard.set(r.flashcard_id, new Date(r.due_at).getTime());
  }
  const now = Date.now();
  const mapped: StudyCard[] = (cards ?? []).map((c) => {
    const has = reviewByCard.has(c.id);
    return {
      id: c.id,
      front: c.front,
      back: c.back,
      isNew: !has,
      due: !has || (reviewByCard.get(c.id) ?? 0) <= now,
    };
  });
  // Due/new first.
  mapped.sort((a, b) => Number(b.due) - Number(a.due));
  return { subtopicName: st?.name ?? "", cards: mapped };
}

// ── Cloze (fill-in-the-blank) ────────────────────────────────────────────────
export type ClozeDeck = {
  subtopicId: string;
  subtopicName: string;
  topic: string;
  subject: string;
  total: number;
};

export async function getClozeDecks(): Promise<ClozeDeck[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("cloze_items")
    .select("id, subtopic:subtopics(id, name, topic:topics(name, subject:subjects(name)))");
  const decks = new Map<string, ClozeDeck>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (data ?? []) as any[]) {
    const st = c.subtopic;
    if (!st) continue;
    const d =
      decks.get(st.id) ??
      ({
        subtopicId: st.id,
        subtopicName: st.name,
        topic: st.topic?.name ?? "",
        subject: st.topic?.subject?.name ?? "",
        total: 0,
      } as ClozeDeck);
    d.total += 1;
    decks.set(st.id, d);
  }
  return [...decks.values()].sort((a, b) => a.subject.localeCompare(b.subject));
}

export type ClozeItem = { id: string; text: string; answer: string };

export async function getClozeItems(
  subtopicId: string
): Promise<{ subtopicName: string; items: ClozeItem[] }> {
  if (!isSupabaseConfigured) return { subtopicName: "", items: [] };
  const supabase = await createClient();
  const { data: st } = await supabase
    .from("subtopics")
    .select("name")
    .eq("id", subtopicId)
    .single();
  const { data } = await supabase
    .from("cloze_items")
    .select("id, text, answer")
    .eq("subtopic_id", subtopicId)
    .limit(50);
  const items = (data ?? []).map((c) => ({ id: c.id, text: c.text, answer: c.answer }));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return { subtopicName: st?.name ?? "", items };
}

export type BankTopic = {
  topicId: string;
  topicName: string;
  subject: string;
  bankCount: number;
  extractedCount: number;
};

export async function getQuestionBank(): Promise<BankTopic[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();

  const [{ data: topics }, { data: bankQ }, { data: exQ }] = await Promise.all([
    supabase.from("topics").select("id, name, sort_order, subject:subjects(name)").order("sort_order"),
    supabase.from("questions").select("id, subtopic:subtopics(topic_id)"),
    supabase.from("extracted_questions").select("topic_id"),
  ]);

  const bankByTopic = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const q of (bankQ ?? []) as any[]) {
    const tid = q.subtopic?.topic_id;
    if (tid) bankByTopic.set(tid, (bankByTopic.get(tid) ?? 0) + 1);
  }
  const exByTopic = new Map<string, number>();
  for (const q of exQ ?? []) {
    if (q.topic_id) exByTopic.set(q.topic_id, (exByTopic.get(q.topic_id) ?? 0) + 1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (topics ?? []).map((t: any) => ({
    topicId: t.id,
    topicName: t.name,
    subject: t.subject?.name ?? "",
    bankCount: bankByTopic.get(t.id) ?? 0,
    extractedCount: exByTopic.get(t.id) ?? 0,
  }));
}

// ── Roster / assign targets ──────────────────────────────────────────────────
export type RosterStudent = { id: string; name: string; email: string | null; classroom: string };

export async function getTutorStudents(): Promise<RosterStudent[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: classes } = await supabase
    .from("classrooms")
    .select("id, name")
    .eq("tutor_id", user.id);
  const ids = (classes ?? []).map((c) => c.id);
  if (ids.length === 0) return [];
  const nameById = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const { data: members } = await supabase
    .from("classroom_members")
    .select("classroom_id, student:profiles(id, full_name, email)")
    .in("classroom_id", ids);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (members ?? []).map((m: any) => ({
    id: m.student?.id,
    name: m.student?.full_name ?? m.student?.email ?? "Student",
    email: m.student?.email ?? null,
    classroom: nameById.get(m.classroom_id) ?? "",
  }));
}

export type ClassroomDetail = {
  id: string;
  name: string;
  invite_code: string;
  members: { id: string; name: string; email: string | null }[];
};

export async function getClassroom(id: string): Promise<ClassroomDetail | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("classrooms")
    .select("id, name, invite_code")
    .eq("id", id)
    .single();
  if (!c) return null;
  const { data: members } = await supabase
    .from("classroom_members")
    .select("student:profiles(id, full_name, email)")
    .eq("classroom_id", id);
  return {
    id: c.id,
    name: c.name,
    invite_code: c.invite_code,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members: (members ?? []).map((m: any) => ({
      id: m.student?.id,
      name: m.student?.full_name ?? m.student?.email ?? "Student",
      email: m.student?.email ?? null,
    })),
  };
}

// ── Assignments ──────────────────────────────────────────────────────────────
export type AssignmentSummary = {
  id: string;
  title: string;
  classroom: string | null;
  dueAt: string | null;
  questionCount: number;
  status: string; // assigned | in_progress | submitted
  score: number | null;
  maxScore: number | null;
};

export async function getStudentAssignments(): Promise<AssignmentSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select(
      "id, title, due_at, classroom:classrooms(name), assignment_questions(count), assignment_submissions(status, score, max_score)"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((a: any) => {
    const sub = a.assignment_submissions?.[0];
    return {
      id: a.id,
      title: a.title,
      classroom: a.classroom?.name ?? null,
      dueAt: a.due_at,
      questionCount: a.assignment_questions?.[0]?.count ?? 0,
      status: sub?.status ?? "assigned",
      score: sub?.score ?? null,
      maxScore: sub?.max_score ?? null,
    };
  });
}

export type AssignmentDetail = {
  id: string;
  title: string;
  questions: {
    id: string;
    stem: string;
    marks: number | null;
    type: string;
    commandWords: string[];
    topic: string | null;
  }[];
  status: string;
  score: number | null;
};

export async function getAssignment(id: string): Promise<AssignmentDetail | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("assignments")
    .select(
      "id, title, assignment_questions(id, stem, marks, type, command_words, sort_order, topic:topics(name)), assignment_submissions(status, score)"
    )
    .eq("id", id)
    .single();
  if (!a) return null;
  const sub = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a as any).assignment_submissions?.[0];
  return {
    id: a.id,
    title: a.title,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions: ((a as any).assignment_questions ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((x: any, y: any) => (x.sort_order ?? 0) - (y.sort_order ?? 0))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((q: any) => ({
        id: q.id,
        stem: q.stem,
        marks: q.marks,
        type: q.type,
        commandWords: q.command_words ?? [],
        topic: q.topic?.name ?? null,
      })),
    status: sub?.status ?? "assigned",
    score: sub?.score ?? null,
  };
}

export type CurriculumOutcome = { id: string; code: string | null; statement: string; frequency: number };
export type CurriculumSubtopic = { id: string; name: string; outcomes: CurriculumOutcome[] };
export type CurriculumTopic = { id: string; name: string; subtopics: CurriculumSubtopic[]; outcomeCount: number };
export type CurriculumSubject = { id: string; name: string; code: string | null; topics: CurriculumTopic[] };

/** Full curriculum tree for the admin browser. */
export async function getFullCurriculum(): Promise<CurriculumSubject[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();

  const [{ data: subjects }, { data: topics }, { data: subtopics }, { data: outcomes }] =
    await Promise.all([
      supabase.from("subjects").select("id, name, syllabus_code, sort_order").order("sort_order"),
      supabase.from("topics").select("id, subject_id, name, sort_order").order("sort_order"),
      supabase.from("subtopics").select("id, topic_id, name, sort_order").order("sort_order"),
      supabase.from("learning_outcomes").select("id, subtopic_id, code, statement, frequency_score"),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outBySub = new Map<string, CurriculumOutcome[]>();
  for (const o of outcomes ?? []) {
    const list = outBySub.get(o.subtopic_id) ?? [];
    list.push({ id: o.id, code: o.code, statement: o.statement, frequency: o.frequency_score ?? 3 });
    outBySub.set(o.subtopic_id, list);
  }
  const subsByTopic = new Map<string, CurriculumSubtopic[]>();
  for (const st of subtopics ?? []) {
    const list = subsByTopic.get(st.topic_id) ?? [];
    list.push({ id: st.id, name: st.name, outcomes: outBySub.get(st.id) ?? [] });
    subsByTopic.set(st.topic_id, list);
  }
  const topicsBySubject = new Map<string, CurriculumTopic[]>();
  for (const t of topics ?? []) {
    const sts = subsByTopic.get(t.id) ?? [];
    const list = topicsBySubject.get(t.subject_id) ?? [];
    list.push({
      id: t.id,
      name: t.name,
      subtopics: sts,
      outcomeCount: sts.reduce((n, s) => n + s.outcomes.length, 0),
    });
    topicsBySubject.set(t.subject_id, list);
  }
  return (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.syllabus_code,
    topics: topicsBySubject.get(s.id) ?? [],
  }));
}

export type ResourceRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  visibility: string;
  mine: boolean;
  extractedCount: number;
  file_size: number | null;
  created_at: string;
  subject: string | null;
};

export async function getResources(): Promise<ResourceRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("resources")
    .select(
      "id, title, type, status, visibility, uploaded_by, extracted_count, file_size, created_at, subject:subjects(name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    visibility: r.visibility ?? "private",
    mine: !!user && r.uploaded_by === user.id,
    extractedCount: r.extracted_count ?? 0,
    file_size: r.file_size,
    created_at: r.created_at,
    subject: r.subject?.name ?? null,
  }));
}

export type PaperView = {
  id: string;
  title: string;
  status: string;
  subject: string | null;
  source: string | null; // e.g. "Anglo-Chinese School · Prelim 2024"
  topics: {
    topicId: string | null;
    topicName: string;
    questions: {
      id: string;
      number: string | null;
      stem: string;
      marks: number | null;
      type: string;
      commandWords: string[];
      confidence: number | null;
    }[];
  }[];
  total: number;
};

/** A single uploaded paper with its extracted questions grouped by topic. */
export async function getPaper(resourceId: string): Promise<PaperView | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resources")
    .select("id, title, status, school, year, paper_type, subject:subjects(name)")
    .eq("id", resourceId)
    .single();
  if (!resource) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rr = resource as any;
  const source =
    [rr.school, [rr.paper_type, rr.year].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(" · ") || null;

  const { data: qs } = await supabase
    .from("extracted_questions")
    .select(
      "id, question_number, stem, marks, type, command_words, confidence, detected_topic_name, topic:topics(id, name, sort_order)"
    )
    .eq("resource_id", resourceId)
    .limit(500);

  type QRow = PaperView["topics"][number]["questions"][number];
  type Group = { topicId: string | null; topicName: string; sort: number; questions: QRow[] };
  const groups = new Map<string, Group>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const q of (qs ?? []) as any[]) {
    const key = q.topic?.id ?? `unknown:${q.detected_topic_name ?? "Unknown"}`;
    const g: Group =
      groups.get(key) ??
      {
        topicId: q.topic?.id ?? null,
        topicName: q.topic?.name ?? q.detected_topic_name ?? "Unclassified",
        sort: q.topic?.sort_order ?? 999,
        questions: [],
      };
    g.questions.push({
      id: q.id,
      number: q.question_number,
      stem: q.stem,
      marks: q.marks,
      type: q.type,
      commandWords: q.command_words ?? [],
      confidence: q.confidence,
    });
    groups.set(key, g);
  }

  const topics = [...groups.values()]
    .sort((a, b) => a.sort - b.sort)
    .map((g) => ({ topicId: g.topicId, topicName: g.topicName, questions: g.questions }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjectName = (resource as any).subject?.name ?? null;
  return {
    id: resource.id,
    title: resource.title,
    status: resource.status,
    subject: subjectName,
    source,
    topics,
    total: (qs ?? []).length,
  };
}

// ── Question bank: a topic's questions (curated + extracted, with source) ─────
export type BankQuestion = {
  id: string;
  stem: string;
  marks: number | null;
  type: string;
  commandWords: string[];
  origin: "bank" | "extracted";
  source: string | null; // for extracted: "School · Type Year · Q3"
};

export async function getTopicQuestions(
  topicId: string
): Promise<{ topicName: string; subject: string; questions: BankQuestion[] }> {
  if (!isSupabaseConfigured) return { topicName: "", subject: "", questions: [] };
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("name, subject:subjects(name)")
    .eq("id", topicId)
    .single();

  // Curated bank questions (via subtopics under this topic).
  const { data: subs } = await supabase.from("subtopics").select("id").eq("topic_id", topicId);
  const subIds = (subs ?? []).map((s) => s.id);
  let bankQ: BankQuestion[] = [];
  if (subIds.length) {
    const { data } = await supabase
      .from("questions")
      .select("id, stem, marks, type, command_words")
      .in("subtopic_id", subIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bankQ = (data ?? []).map((q: any) => ({
      id: q.id,
      stem: q.stem,
      marks: q.marks,
      type: q.type,
      commandWords: q.command_words ?? [],
      origin: "bank" as const,
      source: null,
    }));
  }

  // Extracted questions for this topic (with paper provenance).
  const { data: exRows } = await supabase
    .from("extracted_questions")
    .select("id, stem, marks, type, command_words, question_number, resource:resources(school, year, paper_type, title)")
    .eq("topic_id", topicId)
    .limit(300);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exQ: BankQuestion[] = (exRows ?? []).map((q: any) => {
    const r = q.resource ?? {};
    const src =
      [r.school || r.title, [r.paper_type, r.year].filter(Boolean).join(" "), q.question_number ? `Q${q.question_number}` : ""]
        .filter(Boolean)
        .join(" · ") || null;
    return {
      id: q.id,
      stem: q.stem,
      marks: q.marks,
      type: q.type,
      commandWords: q.command_words ?? [],
      origin: "extracted" as const,
      source: src,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjectName = (topic as any)?.subject?.name ?? "";
  return {
    topicName: topic?.name ?? "",
    subject: subjectName,
    questions: [...bankQ, ...exQ],
  };
}

export type AdminAnalytics = {
  totalStudents: number;
  activeThisWeek: number;
  attemptsMarked: number;
  avgMastery: number;
  aiSpendUsd: number;
  avgLatencyMs: number;
  masteryByTopic: { topic: string; subject: string; mastery: number; learners: number }[];
  hardestOutcomes: { statement: string; subtopic: string; mastery: number; frequency: number }[];
  spendByOp: { op: string; cost: number; calls: number }[];
  signupsByDay: { day: string; count: number }[];
  configured: boolean;
};

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const empty: AdminAnalytics = {
    totalStudents: 0,
    activeThisWeek: 0,
    attemptsMarked: 0,
    avgMastery: 0,
    aiSpendUsd: 0,
    avgLatencyMs: 0,
    masteryByTopic: [],
    hardestOutcomes: [],
    spendByOp: [],
    signupsByDay: [],
    configured: false,
  };
  if (!isSupabaseConfigured) return empty;
  const supabase = await createClient();

  const { count: totalStudents } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student");

  const { count: attemptsMarked } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true });

  // Active this week (distinct users in daily_activity, last 7 days).
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: activeRows } = await supabase
    .from("daily_activity")
    .select("user_id, day")
    .gte("day", weekAgo.toISOString().slice(0, 10));
  const activeThisWeek = new Set((activeRows ?? []).map((r) => r.user_id)).size;

  // Mastery joined to topic for aggregation.
  const { data: masteryRows } = await supabase
    .from("mastery")
    .select(
      `mastery_score, student_id,
       outcome:learning_outcomes ( statement, frequency_score,
         subtopic:subtopics ( name, topic:topics ( name, subject:subjects ( name ) ) ) )`
    )
    .limit(5000);

  const topicAgg = new Map<
    string,
    { subject: string; sum: number; n: number; learners: Set<string> }
  >();
  const outcomeAgg = new Map<
    string,
    { subtopic: string; freq: number; sum: number; n: number }
  >();
  let mSum = 0;
  let mN = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (masteryRows ?? []) as any[]) {
    const score = Number(r.mastery_score) || 0;
    mSum += score;
    mN++;
    const topic = r.outcome?.subtopic?.topic?.name;
    const subject = r.outcome?.subtopic?.topic?.subject?.name ?? "";
    if (topic) {
      const t = topicAgg.get(topic) ?? {
        subject,
        sum: 0,
        n: 0,
        learners: new Set<string>(),
      };
      t.sum += score;
      t.n++;
      t.learners.add(r.student_id);
      topicAgg.set(topic, t);
    }
    const stmt = r.outcome?.statement;
    if (stmt) {
      const o = outcomeAgg.get(stmt) ?? {
        subtopic: r.outcome?.subtopic?.name ?? "",
        freq: r.outcome?.frequency_score ?? 3,
        sum: 0,
        n: 0,
      };
      o.sum += score;
      o.n++;
      outcomeAgg.set(stmt, o);
    }
  }

  const masteryByTopic = [...topicAgg.entries()]
    .map(([topic, v]) => ({
      topic,
      subject: v.subject,
      mastery: Math.round(v.sum / v.n),
      learners: v.learners.size,
    }))
    .sort((a, b) => a.mastery - b.mastery);

  const hardestOutcomes = [...outcomeAgg.entries()]
    .map(([statement, v]) => ({
      statement,
      subtopic: v.subtopic,
      mastery: Math.round(v.sum / v.n),
      frequency: v.freq,
    }))
    .sort((a, b) => a.mastery - b.mastery || b.frequency - a.frequency)
    .slice(0, 6);

  // AI events.
  const { data: aiRows } = await supabase
    .from("ai_events")
    .select("operation, cost_usd, latency_ms")
    .limit(5000);
  const opAgg = new Map<string, { cost: number; calls: number }>();
  let spend = 0;
  let latSum = 0;
  let latN = 0;
  for (const e of aiRows ?? []) {
    spend += Number(e.cost_usd) || 0;
    if (e.latency_ms) {
      latSum += e.latency_ms;
      latN++;
    }
    const o = opAgg.get(e.operation) ?? { cost: 0, calls: 0 };
    o.cost += Number(e.cost_usd) || 0;
    o.calls++;
    opAgg.set(e.operation, o);
  }

  // Signups (from profiles.created_at) last 14 days.
  const { data: signupRows } = await supabase
    .from("profiles")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  const dayAgg = new Map<string, number>();
  for (const p of signupRows ?? []) {
    const day = String(p.created_at).slice(0, 10);
    dayAgg.set(day, (dayAgg.get(day) ?? 0) + 1);
  }
  const signupsByDay = [...dayAgg.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-14);

  return {
    totalStudents: totalStudents ?? 0,
    activeThisWeek,
    attemptsMarked: attemptsMarked ?? 0,
    avgMastery: mN ? Math.round(mSum / mN) : 0,
    aiSpendUsd: spend,
    avgLatencyMs: latN ? Math.round(latSum / latN) : 0,
    masteryByTopic,
    hardestOutcomes,
    spendByOp: [...opAgg.entries()]
      .map(([op, v]) => ({ op, cost: v.cost, calls: v.calls }))
      .sort((a, b) => b.cost - a.cost),
    signupsByDay,
    configured: true,
  };
}

export type TopicProgress = {
  id: string;
  name: string;
  outcomeCount: number;
  practised: number;
  mastery: number; // 0..100, averaged over the topic's outcomes (0 if none)
};

export type SubjectProgress = {
  id: string;
  name: string;
  topics: TopicProgress[];
  mastery: number;
};

/** The full syllabus tree with the current student's progress overlaid.
    Works even before any practice — unpractised outcomes count as 0%. */
export async function getCurriculumProgress(): Promise<SubjectProgress[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: outcomeRows } = await supabase
    .from("learning_outcomes")
    .select(
      `id, subtopic:subtopics ( topic:topics ( id, name, sort_order, subject:subjects ( id, name, sort_order ) ) )`
    );

  const masteryById = new Map<string, number>();
  if (user) {
    const { data: mRows } = await supabase
      .from("mastery")
      .select("learning_outcome_id, mastery_score")
      .eq("student_id", user.id);
    for (const m of mRows ?? [])
      masteryById.set(m.learning_outcome_id, Number(m.mastery_score) || 0);
  }

  type Acc = {
    id: string;
    name: string;
    sort: number;
    subjectId: string;
    subjectName: string;
    subjectSort: number;
    count: number;
    sum: number;
    practised: number;
  };
  const topics = new Map<string, Acc>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (outcomeRows ?? []) as any[]) {
    const t = r.subtopic?.topic;
    const s = t?.subject;
    if (!t || !s) continue;
    const acc =
      topics.get(t.id) ??
      ({
        id: t.id,
        name: t.name,
        sort: t.sort_order ?? 0,
        subjectId: s.id,
        subjectName: s.name,
        subjectSort: s.sort_order ?? 0,
        count: 0,
        sum: 0,
        practised: 0,
      } as Acc);
    const score = masteryById.get(r.id) ?? 0;
    acc.count += 1;
    acc.sum += score;
    if (masteryById.has(r.id)) acc.practised += 1;
    topics.set(t.id, acc);
  }

  const bySubject = new Map<string, SubjectProgress & { sort: number }>();
  for (const t of topics.values()) {
    const subj =
      bySubject.get(t.subjectId) ??
      ({
        id: t.subjectId,
        name: t.subjectName,
        sort: t.subjectSort,
        topics: [],
        mastery: 0,
      } as SubjectProgress & { sort: number });
    subj.topics.push({
      id: t.id,
      name: t.name,
      outcomeCount: t.count,
      practised: t.practised,
      mastery: t.count ? Math.round(t.sum / t.count) : 0,
    });
    bySubject.set(t.subjectId, subj);
  }

  const result = [...bySubject.values()].sort((a, b) => a.sort - b.sort);
  for (const s of result) {
    s.topics.sort((a, b) => a.name.localeCompare(b.name));
    s.mastery = s.topics.length
      ? Math.round(s.topics.reduce((x, t) => x + t.mastery, 0) / s.topics.length)
      : 0;
  }
  return result;
}

export type PracticeQuestion = {
  id: string;
  stem: string;
  type: "mcq" | "structured" | "open_ended" | "data_based" | "diagram" | "practical";
  marks: number;
  commandWords: string[];
  subtopic: string;
  options: { label: string; text: string; isCorrect: boolean; rationale: string | null }[];
};

/** A set of practice questions (optionally scoped to a subtopic). */
export async function getPracticeQuestions(
  subtopicId?: string
): Promise<PracticeQuestion[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select(
      `id, stem, type, marks, command_words,
       subtopic:subtopics ( name ),
       question_options ( label, text, is_correct, distractor_rationale )`
    )
    .limit(10);
  if (subtopicId) query = query.eq("subtopic_id", subtopicId);
  const { data } = await query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((q: any) => ({
    id: q.id,
    stem: q.stem,
    type: q.type,
    marks: q.marks,
    commandWords: q.command_words ?? [],
    subtopic: q.subtopic?.name ?? "",
    options: (q.question_options ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((o: any) => ({
        label: o.label,
        text: o.text,
        isCorrect: o.is_correct,
        rationale: o.distractor_rationale,
      }))
      .sort((a: { label: string }, b: { label: string }) =>
        a.label.localeCompare(b.label)
      ),
  }));
}

/** Randomised question set drawn from the given topics (for a custom paper). */
export async function getQuestionsForTopics(
  topicIds: string[],
  limit = 10
): Promise<PracticeQuestion[]> {
  if (!isSupabaseConfigured || topicIds.length === 0) return [];
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("subtopics")
    .select("id")
    .in("topic_id", topicIds);
  const subIds = (subs ?? []).map((s) => s.id);
  if (subIds.length === 0) return [];

  const { data } = await supabase
    .from("questions")
    .select(
      `id, stem, type, marks, command_words,
       subtopic:subtopics ( name ),
       question_options ( label, text, is_correct, distractor_rationale )`
    )
    .in("subtopic_id", subIds)
    .limit(100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped: PracticeQuestion[] = (data ?? []).map((q: any) => ({
    id: q.id,
    stem: q.stem,
    type: q.type,
    marks: q.marks,
    commandWords: q.command_words ?? [],
    subtopic: q.subtopic?.name ?? "",
    options: (q.question_options ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((o: any) => ({
        label: o.label,
        text: o.text,
        isCorrect: o.is_correct,
        rationale: o.distractor_rationale,
      }))
      .sort((a: { label: string }, b: { label: string }) =>
        a.label.localeCompare(b.label)
      ),
  }));

  // Shuffle then take `limit`.
  for (let i = mapped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
  }
  return mapped.slice(0, limit);
}

/** Current authenticated user's profile (or null). */
export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, level, xp, current_streak, longest_streak, daily_goal_xp, last_active_date"
    )
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

function buildBuckets(outcomes: OutcomeMastery[]): StudyBucket[] {
  const fix = outcomes
    .filter((o) => o.mastery < 55 && o.frequency >= 4)
    .sort((a, b) => a.mastery - b.mastery || b.frequency - a.frequency);
  const high = outcomes
    .filter((o) => o.mastery < 55 && o.frequency < 4)
    .sort((a, b) => a.mastery - b.mastery);
  const low = outcomes
    .filter((o) => o.mastery >= 55 && o.mastery < 78)
    .sort((a, b) => b.mastery - a.mastery);
  return [
    {
      key: "fix_first",
      title: "Fix This First",
      blurb: "Low mastery · high exam frequency",
      items: fix.slice(0, 5),
    },
    {
      key: "high_priority",
      title: "High Priority",
      blurb: "Weak areas worth shoring up",
      items: high.slice(0, 5),
    },
    {
      key: "low_hanging",
      title: "Low-Hanging Fruit",
      blurb: "One good session from mastery",
      items: low.slice(0, 5),
    },
  ];
}

export async function getStudentDashboard(): Promise<StudentDashboard> {
  const empty: StudentDashboard = {
    profile: null,
    overallMastery: 0,
    predictedGrade: "—",
    readiness: 0,
    outcomes: [],
    buckets: buildBuckets([]),
    activity: [],
    hasData: false,
  };
  if (!isSupabaseConfigured) return empty;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const profile = await getProfile();

  const { data: masteryRows } = await supabase
    .from("mastery")
    .select(
      `mastery_score, confidence, attempts_count,
       outcome:learning_outcomes(
         id, statement, code, frequency_score,
         subtopic:subtopics( name, topic:topics( id, name, subject:subjects( name ) ) )
       )`
    )
    .eq("student_id", user.id);

  const outcomes: OutcomeMastery[] = (masteryRows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => {
      const o = r.outcome;
      if (!o) return null;
      return {
        outcomeId: o.id,
        statement: o.statement,
        code: o.code,
        frequency: o.frequency_score ?? 3,
        mastery: Number(r.mastery_score) || 0,
        confidence: Number(r.confidence) || 0,
        attempts: r.attempts_count ?? 0,
        subtopic: o.subtopic?.name ?? "",
        topic: o.subtopic?.topic?.name ?? "",
        topicId: o.subtopic?.topic?.id ?? null,
        subject: o.subtopic?.topic?.subject?.name ?? "",
      } as OutcomeMastery;
    })
    .filter(Boolean) as OutcomeMastery[];

  const { data: activityRows } = await supabase
    .from("daily_activity")
    .select("day, xp, minutes")
    .eq("user_id", user.id)
    .order("day", { ascending: true })
    .limit(30);

  const overallMastery = outcomes.length
    ? Math.round(outcomes.reduce((s, o) => s + o.mastery, 0) / outcomes.length)
    : 0;

  // Readiness weights each outcome by exam frequency.
  const wSum = outcomes.reduce((s, o) => s + o.frequency, 0);
  const readiness = wSum
    ? Math.round(
        outcomes.reduce((s, o) => s + o.mastery * o.frequency, 0) / wSum
      )
    : 0;

  return {
    profile,
    overallMastery,
    predictedGrade: outcomes.length ? toGrade(readiness) : "—",
    readiness,
    outcomes,
    buckets: buildBuckets(outcomes),
    activity: (activityRows as DailyActivity[]) ?? [],
    hasData: outcomes.length > 0,
  };
}
