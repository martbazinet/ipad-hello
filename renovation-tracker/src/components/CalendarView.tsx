import { useState } from 'react';
import type { AppData, CalendarEvent } from '../types';
import type { Updater } from '../store';
import { newEvent } from '../store';
import { WEEKDAYS, addDays, monthGrid, monthLabel, parseDate, prettyDate, today } from '../dates';
import { EVENT_KIND_LABEL, ISSUE_LABEL, itemsOn, roomColor, roomIndexOf, scheduleIssue, upcoming } from '../schedule';
import { EventEditor } from './EventEditor';

const MAX_PER_DAY = 4;

export function CalendarView(props: { data: AppData; update: Updater; openRoom: (id: string) => void }) {
  const { data } = props;
  const todayStr = today();
  const now = parseDate(todayStr);
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [roomFilter, setRoomFilter] = useState('');
  const [editing, setEditing] = useState<{ event: CalendarEvent; isNew: boolean } | null>(null);

  const shift = (n: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + n, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const saveEvent = (e: CalendarEvent) => {
    props.update((d) => {
      const i = d.events.findIndex((x) => x.id === e.id);
      if (i >= 0) d.events[i] = e;
      else d.events.push(e);
    });
    setEditing(null);
  };

  const deleteEvent = (id: string) => {
    props.update((d) => {
      d.events = d.events.filter((x) => x.id !== id);
    });
    setEditing(null);
  };

  const days = monthGrid(month.year, month.month);
  const soon = upcoming(data, todayStr, addDays(todayStr, 30)).filter((i) => !roomFilter || i.roomId === roomFilter || i.roomId === '');

  return (
    <div className="page">
      <section className="card">
        <div className="cal-toolbar">
          <div className="row">
            <button onClick={() => shift(-1)} aria-label="Previous month">
              ‹
            </button>
            <button onClick={() => setMonth({ year: now.getFullYear(), month: now.getMonth() })}>Today</button>
            <button onClick={() => shift(1)} aria-label="Next month">
              ›
            </button>
          </div>
          <h2 className="cal-title">{monthLabel(month.year, month.month)}</h2>
          <div className="row">
            <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} aria-label="Filter by room">
              <option value="">All rooms</option>
              {data.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || '(unnamed)'}
                </option>
              ))}
            </select>
            <button className="primary" onClick={() => setEditing({ event: { ...newEvent(todayStr), roomId: roomFilter }, isNew: true })}>
              + Appointment
            </button>
          </div>
        </div>

        <div className="cal-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday">
              {w}
            </div>
          ))}
          {days.map((day) => {
            const { tasks, events, expiries } = itemsOn(data, day, todayStr, roomFilter);
            const entries = [
              ...events.map((e) => {
                const i = roomIndexOf(data.rooms, e.roomId);
                return (
                  <button
                    key={e.id}
                    className="cal-item event"
                    style={{ borderLeftColor: i >= 0 ? roomColor(i) : '#4b5563' }}
                    title={`${EVENT_KIND_LABEL[e.kind]}${e.notes ? ` – ${e.notes}` : ''}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setEditing({ event: e, isNew: false });
                    }}
                  >
                    {e.time && <span className="cal-time">{e.time}</span>}
                    {e.title}
                  </button>
                );
              }),
              ...tasks.map(({ room, roomIndex, task }) => {
                const issue = scheduleIssue(task, todayStr);
                return (
                  <button
                    key={task.id}
                    className={`cal-item task${task.status === 'done' ? ' done' : ''}${issue === 'overdue' ? ' overdue' : ''}`}
                    style={{ background: roomColor(roomIndex) }}
                    title={`${room.name} · ${task.name} (${task.percent}%)${issue ? ` – ${ISSUE_LABEL[issue]}` : ''}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      props.openRoom(room.id);
                    }}
                  >
                    {task.name}
                  </button>
                );
              }),
              ...expiries.map(({ room, task, quote }) => (
                <button
                  key={quote.id}
                  className="cal-item expiry"
                  title={`${room.name} · ${task.name}: quote from ${quote.contractor || 'unnamed'} expires`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    props.openRoom(room.id);
                  }}
                >
                  Quote expires: {quote.contractor || 'unnamed'}
                </button>
              )),
            ];
            const inMonth = parseDate(day).getMonth() === month.month;
            return (
              <div
                key={day}
                className={`cal-day${inMonth ? '' : ' other'}${day === todayStr ? ' today' : ''}`}
                onClick={() => setEditing({ event: { ...newEvent(day), roomId: roomFilter }, isNew: true })}
                title="Click to add an appointment"
              >
                <span className="cal-date">{parseDate(day).getDate()}</span>
                {entries.slice(0, MAX_PER_DAY)}
                {entries.length > MAX_PER_DAY && <span className="cal-more">+{entries.length - MAX_PER_DAY} more</span>}
              </div>
            );
          })}
        </div>
        <p className="muted small">
          Colored bars are tasks (by room, using planned dates, or actual dates if none are planned). White items with a colored edge
          are appointments. Click a task to open its room, or click an empty spot on a day to add an appointment.
        </p>
      </section>

      <section className="card">
        <h2>Next 30 days</h2>
        {soon.length === 0 ? (
          <p className="muted">Nothing scheduled. Add planned dates to tasks or add appointments.</p>
        ) : (
          <ul className="upcoming">
            {soon.map((i, n) => (
              <li key={n}>
                <span className="up-date">{prettyDate(i.date)}</span>
                <span className="up-dot" style={{ background: i.color }} />
                {i.event ? (
                  <button className="link" onClick={() => setEditing({ event: i.event!, isNew: false })}>
                    {i.label}
                  </button>
                ) : (
                  <button className="link" onClick={() => props.openRoom(i.roomId)}>
                    {i.label}
                  </button>
                )}
                <span className="muted small">{i.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <EventEditor
          event={editing.event}
          isNew={editing.isNew}
          rooms={data.rooms}
          onSave={saveEvent}
          onDelete={() => deleteEvent(editing.event.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
