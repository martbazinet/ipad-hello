import { useCallback, useEffect, useState } from 'react';
import type { AppData, CalendarEvent, Quote, QuoteType, Room, Task } from './types';
import { loadData, newId, saveData } from './storage';
import { today } from './dates';

export type Updater = (fn: (draft: AppData) => void) => void;

/** App state, saved to localStorage on every change. */
export function useAppData() {
  const [data, setData] = useState<AppData>(loadData);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      saveData(data);
      setSaveError(null);
    } catch (e) {
      setSaveError(`Could not save: ${(e as Error).message}`);
    }
  }, [data]);

  const update: Updater = useCallback((fn) => {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  return { data, setData, update, saveError };
}

export function findRoom(d: AppData, roomId: string): Room {
  const r = d.rooms.find((x) => x.id === roomId);
  if (!r) throw new Error(`Room ${roomId} not found`);
  return r;
}

export function findTask(d: AppData, roomId: string, taskId: string): Task {
  const t = findRoom(d, roomId).tasks.find((x) => x.id === taskId);
  if (!t) throw new Error(`Task ${taskId} not found`);
  return t;
}

export const newRoom = (name: string): Room => ({ id: newId(), name, notes: '', tasks: [], attachments: [] });

export const newTask = (name: string): Task => ({
  id: newId(),
  name,
  status: 'not_started',
  percent: 0,
  estMaterial: 0,
  estLabor: 0,
  actualMaterial: 0,
  actualLabor: 0,
  plannedStart: '',
  plannedEnd: '',
  actualStart: '',
  actualEnd: '',
  notes: '',
  quotes: [],
  attachments: [],
});

export { today };

export const newQuote = (type: QuoteType): Quote => ({
  id: newId(),
  type,
  contractor: '',
  description: '',
  contact: '',
  date: today(),
  validUntil: '',
  material: 0,
  labor: 0,
  status: 'pending',
  notes: '',
  attachments: [],
});

export const newEvent = (date: string): CalendarEvent => ({
  id: newId(),
  title: '',
  kind: 'visit',
  date,
  time: '',
  roomId: '',
  notes: '',
});
