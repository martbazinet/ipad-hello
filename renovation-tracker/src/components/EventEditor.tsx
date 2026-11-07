import { useEffect, useState } from 'react';
import type { CalendarEvent, EventKind, Room } from '../types';
import { EVENT_KIND_LABEL } from '../schedule';
import { isDate } from '../dates';

/** Dialog to add or edit an appointment/deadline. */
export function EventEditor(props: {
  event: CalendarEvent;
  isNew: boolean;
  rooms: Room[];
  onSave: (e: CalendarEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [e, setE] = useState(props.event);
  const set = <K extends keyof CalendarEvent>(k: K, v: CalendarEvent[K]) => setE((x) => ({ ...x, [k]: v }));
  const valid = e.title.trim() !== '' && isDate(e.date);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && props.onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props]);

  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <form
        className="modal card"
        onClick={(ev) => ev.stopPropagation()}
        onSubmit={(ev) => {
          ev.preventDefault();
          if (valid) props.onSave({ ...e, title: e.title.trim() });
        }}
      >
        <h2>{props.isNew ? 'New appointment' : 'Edit appointment'}</h2>
        <div className="grid">
          <label className="field wide-col">
            <span>Title</span>
            <input autoFocus value={e.title} placeholder="e.g. Plumber visit, Tile delivery" onChange={(x) => set('title', x.target.value)} />
          </label>
          <label className="field">
            <span>Type</span>
            <select value={e.kind} onChange={(x) => set('kind', x.target.value as EventKind)}>
              {(Object.keys(EVENT_KIND_LABEL) as EventKind[]).map((k) => (
                <option key={k} value={k}>
                  {EVENT_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Room</span>
            <select value={e.roomId} onChange={(x) => set('roomId', x.target.value)}>
              <option value="">Whole house</option>
              {props.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || '(unnamed)'}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={e.date} onChange={(x) => set('date', x.target.value)} />
          </label>
          <label className="field">
            <span>Time (optional)</span>
            <input type="time" value={e.time} onChange={(x) => set('time', x.target.value)} />
          </label>
        </div>
        <label className="field wide">
          <span>Notes</span>
          <textarea rows={3} value={e.notes} onChange={(x) => set('notes', x.target.value)} />
        </label>
        <div className="modal-actions">
          {!props.isNew && (
            <button
              type="button"
              className="danger"
              onClick={() => confirm(`Delete "${e.title || 'this appointment'}"?`) && props.onDelete()}
            >
              Delete
            </button>
          )}
          <span className="grow" />
          <button type="button" onClick={props.onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={!valid}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
