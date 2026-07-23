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
  /**
   * Opaque, permanent identity. Assigned once when the event first appears and
   * never regenerated. Do NOT derive this from date, title, or venue.
   *
   * Picks used to be keyed by `date|title`, so any title change silently
   * orphaned a saved star: it vanished from the owner's subscribed calendar
   * with no error and no trace. Titles change often — a dedupe merge, a typo
   * fixed in the GitHub web editor, a venue renaming its own show.
   */
  uid: string;
  /**
   * Identities that now resolve to this event: uids of duplicates merged into
   * it, and legacy `date|title` keys. Lets an old saved pick keep working
   * instead of dangling.
   */
  aliases?: string[];
  day: string;
  date: string;
  /**
   * The event, without its venue. Titles used to arrive as "Venue: Title" 66%
   * of the time and bare the rest, with 13 venues using both, so sorting by
   * title grouped by venue instead of by event. The venue is shown separately.
   */
  event: string;
  /** Display string: "Venue, Neighborhood". Derived from the parts below. */
  where: string;
  /** Canonical venue name, so the same place reads the same way everywhere. */
  venue?: string;
  neighborhood?: string | null;
  /** Street address, kept out of the display string. */
  address?: string | null;
  cost: string;
  category: Category;
  flag: Flag;
  mode: Mode;
  start: string | null;
  end: string | null;
  note: string | null;
  url: string | null;
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
