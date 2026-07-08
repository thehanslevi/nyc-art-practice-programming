export type Category =
  | "sound"
  | "dance"
  | "film"
  | "tech"
  | "making"
  | "theatre"
  | "literature"
  | "community";
export type Flag = "urgent" | "priority" | "decide" | null;
export type CategoryFilter = "all" | Category;

export type Mode = "make" | "witness";
export type SpaceMode = Mode | "both";
export type TabMode = "practice" | "attend" | "all";

export interface CalEvent {
  day: string;
  date: string;
  event: string;
  where: string;
  cost: string;
  category: Category;
  flag: Flag;
  mode: Mode;
  start: string | null;
  end: string | null;
  note: string | null;
  url: string | null;
  /** Curator's editorial marker — surfaces the event in the "Don't miss" lede. */
  pick?: boolean;
  /** One-line editorial reason shown with a curator pick. */
  pickNote?: string | null;
}

export interface Week {
  label: string;
  events: CalEvent[];
}

export interface EventsData {
  lastVerified: string;
  weeks: Week[];
}

export interface Space {
  name: string;
  category: Category;
  description: string;
  note: string;
  url: string | null;
  mode?: SpaceMode;
}
