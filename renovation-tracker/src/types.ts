export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export type QuoteStatus = 'pending' | 'accepted' | 'rejected';
/** Contractor: labor, often with materials. Supplier: hardware/materials store. Rental: equipment. */
export type QuoteType = 'contractor' | 'supplier' | 'rental';

/** Metadata for a photo or PDF. The file itself lives in IndexedDB under `id`. */
export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
}

/**
 * All money amounts are in CAD, before tax.
 * Supplier and rental quotes only use `material` (labor stays 0).
 * One quote per type can be accepted on a task.
 */
export interface Quote {
  id: string;
  type: QuoteType;
  /** Company name: contractor, store or rental company. */
  contractor: string;
  /** What is being quoted, e.g. "Porcelain tile 12x24, grey, 220 sq ft". */
  description: string;
  contact: string;
  /** Date the quote was received. */
  date: string;
  /** Date the quote expires ('' if unknown). Shown on the calendar while pending. */
  validUntil: string;
  material: number;
  labor: number;
  status: QuoteStatus;
  notes: string;
  attachments: Attachment[];
}

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  /** 0-100 */
  percent: number;
  estMaterial: number;
  estLabor: number;
  actualMaterial: number;
  actualLabor: number;
  /** Schedule dates as YYYY-MM-DD, '' when not set. */
  plannedStart: string;
  plannedEnd: string;
  actualStart: string;
  actualEnd: string;
  notes: string;
  quotes: Quote[];
  attachments: Attachment[];
}

export interface Room {
  id: string;
  name: string;
  notes: string;
  tasks: Task[];
  attachments: Attachment[];
}

export interface Settings {
  province: string;
  gstRate: number;
  pstRate: number;
}

export type EventKind = 'visit' | 'delivery' | 'inspection' | 'deadline' | 'other';

/** An appointment or deadline that isn't a task, e.g. a contractor visit or a delivery. */
export interface CalendarEvent {
  id: string;
  title: string;
  kind: EventKind;
  date: string;
  /** HH:MM, '' for all day. */
  time: string;
  /** Optional link to a room ('' for the whole house). */
  roomId: string;
  notes: string;
}

export interface AppData {
  version: 1;
  rooms: Room[];
  events: CalendarEvent[];
  settings: Settings;
}
