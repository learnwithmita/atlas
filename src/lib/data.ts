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
      "id, title, type, status, visibility, uploaded_by, file_size, created_at, subject:subjects(name)"
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
    file_size: r.file_size,
    created_at: r.created_at,
    subject: r.subject?.name ?? null,
  }));
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
         subtopic:subtopics( name, topic:topics( name, subject:subjects( name ) ) )
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
