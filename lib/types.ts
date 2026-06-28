// Geteilte Typen für API-Antworten (Client + Server).

export type EventStatus = "idea" | "planning" | "active" | "done" | "cancelled";
export type Priority = "normal" | "wichtig" | "dringend";
export type NewsStatus = "draft" | "published" | "hidden" | "archived";
export type PollMethod = "single" | "approval" | "ranked";
export type PollStatus = "open" | "closed" | "invalid";

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  assignee: string | null;
  assignee_ids: string[];
  points: number;
  points_awarded: boolean;
  due_at: string | null;
  ord: number;
}

export interface Slot {
  id: string;
  label: string;
  capacity: number | null;
  ord: number;
  signups: SignupView[];
  taken: number;
  full: boolean;
  mine: boolean;
}

export interface SignupView {
  id: string;
  display_name: string;
  status: "confirmed" | "waitlist";
  mine: boolean;
}

export interface SignupList {
  id: string;
  title: string;
  overflow: "block" | "waitlist";
  slots: Slot[];
}

export interface EventSummary {
  id: string;
  title: string;
  status: EventStatus;
  start_at: string | null;
  money_goal_cents: number | null;
  money_goal_note: string | null;
  done_count: number;
  total_count: number;
}

export interface EventDetail extends EventSummary {
  description: string;
  end_at: string | null;
  milestones: Milestone[];
  lists: SignupList[];
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: Priority;
  status: NewsStatus;
  featured: boolean;
  featured_until: string | null;
  published_at: string | null;
  created_at: string;
}

export interface PollOption {
  id: string;
  label: string;
  ord: number;
}

export interface PollResultRow {
  option_id: string;
  label: string;
  value: number; // Stimmen bzw. Borda-Punkte
  pct: number;
  veto_count?: number;
}

export interface PollDetail {
  id: string;
  question: string;
  method: PollMethod;
  anonymous: boolean;
  reveal: "live" | "after_close";
  rank_limit: number | null;
  ranked_veto_enabled: boolean;
  status: PollStatus;
  closes_at: string | null;
  quorum: number | null;
  result_visibility_min: number;
  options: PollOption[];
  total_ballots: number;
  voted: boolean; // hat dieses Gerät schon abgestimmt?
  my_choice: { option_id: string; rank: number | null }[];
  results: PollResultRow[] | null; // null = noch nicht sichtbar
  results_hidden_reason: string | null;
}

export interface LedgerEntry {
  id: string;
  kind: "income" | "expense";
  amount: number; // Cent
  description: string;
  category: string;
  occurred_at: string;
  paid_by: string | null; // nur Admin
}

export interface EventGoal {
  id: string;
  title: string;
  status: EventStatus;
  start_at: string | null;
  money_goal_cents: number;
  money_goal_note: string | null;
}

export interface Comment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
  mine: boolean;
}

export interface AbizeitungEntry {
  id: string;
  author_name: string;
  quote: string | null;
  quoted_name: string | null;
  caption: string | null;
  image_url: string | null;
  image_name: string | null;
  created_at: string;
  mine: boolean;
}

export interface Me {
  name: string;
  show_on_leaderboard: boolean;
  points: number;
  history: { id: string; points: number; reason: string; created_at: string }[];
}

export interface LeaderboardRow {
  name: string;
  points: number;
  rank: number;
  mine: boolean;
}

export interface MemberRow {
  user_id: string;
  name: string;
  points: number;
}

export interface TodayDigest {
  featuredNews: NewsItem[];
  urgent: { type: "poll" | "event" | "news"; id: string; title: string; closes_at: string }[];
  upcoming: EventSummary[];
  openPolls: {
    id: string;
    question: string;
    total_ballots: number;
    voted: boolean;
    closes_at: string | null;
  }[];
}

export interface MyAssignedMilestone {
  id: string;
  title: string;
  done: boolean;
  assignee: string | null;
  points: number;
  due_at: string | null;
  event_id: string;
  event_title: string;
  event_start_at: string | null;
  event_status: EventStatus;
}

export interface MySignupTask {
  id: string;
  status: "confirmed" | "waitlist";
  event_id: string;
  event_title: string;
  event_start_at: string | null;
  list_title: string;
  slot_label: string;
  capacity: number | null;
}

export interface MyTasksData {
  open_milestones: MyAssignedMilestone[];
  done_milestones: MyAssignedMilestone[];
  signups: MySignupTask[];
}

export interface AppBadges {
  events: number;
  votes: number;
  tasks: number;
  news: number;
  more: boolean;
}
