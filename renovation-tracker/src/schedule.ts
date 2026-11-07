import type { AppData, CalendarEvent, EventKind, Quote, Room, Task } from './types';
import { daysBetween, isDate } from './dates';

/** One color per room, by its position in the room list. */
const ROOM_COLORS = ['#2f6fde', '#1f9d55', '#c2410c', '#8a4fd0', '#0e8a8a', '#c0337a', '#7a6a00', '#4b5563'];
export const roomColor = (index: number) => ROOM_COLORS[index % ROOM_COLORS.length];

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  visit: 'Contractor visit',
  delivery: 'Delivery',
  inspection: 'Inspection',
  deadline: 'Deadline',
  other: 'Other',
};

export interface DateRange {
  start: string;
  end: string;
}

/** Planned dates; a missing end means a one-day task. */
export function plannedRange(t: Task): DateRange | null {
  if (!isDate(t.plannedStart) && !isDate(t.plannedEnd)) return null;
  const start = t.plannedStart || t.plannedEnd;
  const end = t.plannedEnd || t.plannedStart;
  return end < start ? { start: end, end: start } : { start, end };
}

/** Actual dates; an in-progress task without an end runs until today. */
export function actualRange(t: Task, todayStr: string): DateRange | null {
  if (!isDate(t.actualStart)) return null;
  const end = isDate(t.actualEnd) ? t.actualEnd : t.status === 'done' ? t.actualStart : todayStr;
  return end < t.actualStart ? { start: t.actualStart, end: t.actualStart } : { start: t.actualStart, end };
}

/** Range shown on the calendar: planned dates if set, otherwise actual dates. */
export const displayRange = (t: Task, todayStr: string) => plannedRange(t) ?? actualRange(t, todayStr);

export type ScheduleIssue = 'overdue' | 'late_start' | 'bad_dates';

export function scheduleIssue(t: Task, todayStr: string): ScheduleIssue | null {
  if (isDate(t.plannedStart) && isDate(t.plannedEnd) && t.plannedEnd < t.plannedStart) return 'bad_dates';
  if (isDate(t.actualStart) && isDate(t.actualEnd) && t.actualEnd < t.actualStart) return 'bad_dates';
  if (t.status === 'done') return null;
  const end = t.plannedEnd || t.plannedStart;
  if (isDate(end) && end < todayStr) return 'overdue';
  if (t.status === 'not_started' && isDate(t.plannedStart) && t.plannedStart < todayStr) return 'late_start';
  return null;
}

export const ISSUE_LABEL: Record<ScheduleIssue, string> = {
  overdue: 'Overdue',
  late_start: 'Late start',
  bad_dates: 'Check dates',
};

/** Days late at the planned end (positive) or early (negative), for done tasks with both dates. */
export function endSlip(t: Task): number | null {
  const plannedEnd = t.plannedEnd || t.plannedStart;
  if (!isDate(plannedEnd) || !isDate(t.actualEnd)) return null;
  return daysBetween(plannedEnd, t.actualEnd);
}

export interface TaskRef {
  room: Room;
  roomIndex: number;
  task: Task;
}

export const allTasks = (rooms: Room[]): TaskRef[] =>
  rooms.flatMap((room, roomIndex) => room.tasks.map((task) => ({ room, roomIndex, task })));

export interface QuoteExpiry {
  room: Room;
  roomIndex: number;
  task: Task;
  quote: Quote;
}

/** Pending quotes with a "valid until" date. */
export const pendingExpiries = (rooms: Room[]): QuoteExpiry[] =>
  allTasks(rooms).flatMap(({ room, roomIndex, task }) =>
    task.quotes.filter((q) => q.status === 'pending' && isDate(q.validUntil)).map((quote) => ({ room, roomIndex, task, quote })),
  );

/** Everything happening on one day, for the month calendar. */
export function itemsOn(data: AppData, day: string, todayStr: string, roomFilter: string) {
  const roomOk = (id: string) => !roomFilter || id === roomFilter;
  const tasks = allTasks(data.rooms).filter(({ room, task }) => {
    if (!roomOk(room.id)) return false;
    const r = displayRange(task, todayStr);
    return !!r && r.start <= day && day <= r.end;
  });
  const events = data.events
    .filter((e) => e.date === day && (!roomFilter || e.roomId === roomFilter || e.roomId === ''))
    .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const expiries = pendingExpiries(data.rooms).filter((x) => x.quote.validUntil === day && roomOk(x.room.id));
  return { tasks, events, expiries };
}

export const roomIndexOf = (rooms: Room[], roomId: string) => rooms.findIndex((r) => r.id === roomId);

export const eventRoomName = (rooms: Room[], e: CalendarEvent) => rooms.find((r) => r.id === e.roomId)?.name ?? '';

export interface UpcomingItem {
  date: string;
  label: string;
  detail: string;
  kind: 'start' | 'end' | 'event' | 'expiry';
  roomId: string;
  color: string;
  event?: CalendarEvent;
}

/** Task starts/ends, appointments and quote expiries from today through `days` days ahead. */
export function upcoming(data: AppData, todayStr: string, untilStr: string): UpcomingItem[] {
  const inWindow = (d: string) => isDate(d) && d >= todayStr && d <= untilStr;
  const items: UpcomingItem[] = [];
  for (const { room, roomIndex, task } of allTasks(data.rooms)) {
    if (task.status === 'done') continue;
    const color = roomColor(roomIndex);
    if (task.status === 'not_started' && inWindow(task.plannedStart)) {
      items.push({ date: task.plannedStart, label: `Start: ${task.name}`, detail: room.name, kind: 'start', roomId: room.id, color });
    }
    const end = task.plannedEnd || task.plannedStart;
    if (inWindow(end) && !(task.status === 'not_started' && end === task.plannedStart)) {
      items.push({ date: end, label: `Finish: ${task.name}`, detail: room.name, kind: 'end', roomId: room.id, color });
    }
  }
  for (const e of data.events) {
    if (!inWindow(e.date)) continue;
    const i = roomIndexOf(data.rooms, e.roomId);
    items.push({
      date: e.date,
      label: `${e.time ? `${e.time} ` : ''}${e.title || EVENT_KIND_LABEL[e.kind]}`,
      detail: [EVENT_KIND_LABEL[e.kind], eventRoomName(data.rooms, e)].filter(Boolean).join(' · '),
      kind: 'event',
      roomId: e.roomId,
      color: i >= 0 ? roomColor(i) : '#4b5563',
      event: e,
    });
  }
  for (const x of pendingExpiries(data.rooms)) {
    if (!inWindow(x.quote.validUntil)) continue;
    items.push({
      date: x.quote.validUntil,
      label: `Quote expires: ${x.quote.contractor || 'unnamed'}`,
      detail: `${x.room.name} · ${x.task.name}`,
      kind: 'expiry',
      roomId: x.room.id,
      color: roomColor(x.roomIndex),
    });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
}
