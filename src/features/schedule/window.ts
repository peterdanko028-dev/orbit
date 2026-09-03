/** The day's plannable span. Blocks and habits outside it still render — only gap creation is bounded. */
export const DAY_START_MIN = 7 * 60
export const DAY_END_MIN = 22 * 60

/** A gap shorter than this isn't worth offering as a slot to schedule into. */
export const MIN_GAP_MIN = 15

/** Long empty stretches split here so an empty day reads as Morning / Afternoon / Evening, not one 15-hour slot. */
export const SPLIT_AT_MIN = [12 * 60, 17 * 60]

/** How long a task occupies on the timeline when it has no duration of its own. */
export const DEFAULT_TASK_MIN = 30

/** Monday-first weekday order, for the Schedule grid (Habits stays Sunday-first). */
export const SCHEDULE_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Pixels per minute in the to-scale week grid. */
export const PX_PER_MIN = 0.8
