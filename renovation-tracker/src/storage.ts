import type { AppData, Attachment, Room } from './types';
import { isDate } from './dates';

/**
 * Project data (rooms, tasks, quotes, settings) is stored as JSON in localStorage.
 * Photo and PDF files are too large for localStorage (about 5 MB total), so the
 * file contents are stored in this browser's IndexedDB, keyed by attachment id.
 */

const DATA_KEY = 'renovation-tracker:data';
const DB_NAME = 'renovation-tracker';
const STORE = 'files';

export function defaultData(): AppData {
  return {
    version: 1,
    rooms: [],
    events: [],
    settings: { province: 'QC', gstRate: 5, pstRate: 9.975 },
  };
}

const EVENT_KINDS = ['visit', 'delivery', 'inspection', 'deadline', 'other'];

export function loadData(): AppData {
  const raw = localStorage.getItem(DATA_KEY);
  if (!raw) return defaultData();
  try {
    return normalize(JSON.parse(raw));
  } catch {
    console.error('Saved data could not be read; starting empty. Raw data kept under a backup key.');
    localStorage.setItem(`${DATA_KEY}:corrupt-${Date.now()}`, raw);
    return defaultData();
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

/** Fill in missing fields so older or hand-edited data still loads. */
export function normalize(input: unknown): AppData {
  const d = input as Partial<AppData>;
  if (!d || !Array.isArray(d.rooms)) throw new Error('Not a renovation tracker file');
  const base = defaultData();
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const atts = (v: unknown): Attachment[] => (Array.isArray(v) ? v : []);
  // Dates are optional; anything that isn't YYYY-MM-DD becomes "not set".
  const date = (v: unknown) => (isDate(str(v)) ? str(v) : '');
  return {
    version: 1,
    settings: { ...base.settings, ...(d.settings ?? {}) },
    events: (Array.isArray(d.events) ? d.events : [])
      .filter((e) => isDate(e?.date))
      .map((e) => ({
        id: str(e.id) || newId(),
        title: str(e.title),
        kind: EVENT_KINDS.includes(e.kind) ? e.kind : 'other',
        date: e.date,
        time: /^\d{2}:\d{2}$/.test(str(e.time)) ? e.time : '',
        roomId: str(e.roomId),
        notes: str(e.notes),
      })),
    rooms: d.rooms.map((r: Room) => ({
      id: str(r.id) || newId(),
      name: str(r.name),
      notes: str(r.notes),
      attachments: atts(r.attachments),
      tasks: (Array.isArray(r.tasks) ? r.tasks : []).map((t) => ({
        id: str(t.id) || newId(),
        name: str(t.name),
        status: ['not_started', 'in_progress', 'done'].includes(t.status) ? t.status : 'not_started',
        percent: Math.min(100, Math.max(0, num(t.percent))),
        estMaterial: num(t.estMaterial),
        estLabor: num(t.estLabor),
        actualMaterial: num(t.actualMaterial),
        actualLabor: num(t.actualLabor),
        plannedStart: date(t.plannedStart),
        plannedEnd: date(t.plannedEnd),
        actualStart: date(t.actualStart),
        actualEnd: date(t.actualEnd),
        notes: str(t.notes),
        attachments: atts(t.attachments),
        quotes: (Array.isArray(t.quotes) ? t.quotes : []).map((q) => ({
          id: str(q.id) || newId(),
          // Quotes saved before quote types existed are contractor quotes.
          type: ['contractor', 'supplier', 'rental'].includes(q.type) ? q.type : 'contractor',
          contractor: str(q.contractor),
          description: str(q.description),
          contact: str(q.contact),
          date: str(q.date),
          validUntil: date(q.validUntil),
          material: num(q.material),
          labor: num(q.labor),
          status: ['pending', 'accepted', 'rejected'].includes(q.status) ? q.status : 'pending',
          notes: str(q.notes),
          attachments: atts(q.attachments),
        })),
      })),
    })),
  };
}

export const newId = () => crypto.randomUUID();

// ---------- IndexedDB file store ----------

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
      }),
  );
}

export const putFile = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id));
export const getFile = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id));
export const deleteFile = (id: string) => tx('readwrite', (s) => s.delete(id));
export const clearFiles = () => tx('readwrite', (s) => s.clear());

/** Ask the browser not to evict our data when disk space is low. */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => undefined);
}

// ---------- Export / import ----------

interface ExportFile {
  app: 'renovation-tracker';
  exportedAt: string;
  data: AppData;
  /** attachment id -> data URL */
  files: Record<string, string>;
}

export function allAttachments(rooms: Room[]): Attachment[] {
  return rooms.flatMap((r) => [
    ...r.attachments,
    ...r.tasks.flatMap((t) => [...t.attachments, ...t.quotes.flatMap((q) => q.attachments)]),
  ]);
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(b);
  });

export async function exportBackup(data: AppData): Promise<Blob> {
  const files: Record<string, string> = {};
  for (const a of allAttachments(data.rooms)) {
    const blob = await getFile(a.id);
    if (blob) files[a.id] = await blobToDataUrl(blob);
  }
  const out: ExportFile = { app: 'renovation-tracker', exportedAt: new Date().toISOString(), data, files };
  return new Blob([JSON.stringify(out)], { type: 'application/json' });
}

/** Replaces all current data and files with the backup's contents. */
export async function importBackup(file: File): Promise<AppData> {
  const parsed = JSON.parse(await file.text()) as Partial<ExportFile>;
  if (parsed.app !== 'renovation-tracker' || !parsed.data) {
    throw new Error('This file is not a Renovation Tracker backup.');
  }
  const data = normalize(parsed.data);
  await clearFiles();
  for (const [id, url] of Object.entries(parsed.files ?? {})) {
    const blob = await (await fetch(url)).blob();
    await putFile(id, blob);
  }
  saveData(data);
  return data;
}
