import type { AppData } from '../types';
import { addDays, daysBetween, isDate, parseDate, prettyRange, today } from '../dates';
import { EVENT_KIND_LABEL, ISSUE_LABEL, actualRange, plannedRange, roomColor, roomIndexOf, scheduleIssue } from '../schedule';

const LABEL_WIDTH = 220;
const PAD_DAYS = 3;

/** Gantt-style view: one row per task, grouped by room. */
export function TimelineView(props: { data: AppData; openRoom: (id: string) => void }) {
  const { data } = props;
  const todayStr = today();

  // Collect every date that should be visible.
  const dates: string[] = [];
  for (const r of data.rooms) {
    for (const t of r.tasks) {
      const p = plannedRange(t);
      const a = actualRange(t, todayStr);
      if (p) dates.push(p.start, p.end);
      if (a) dates.push(a.start, a.end);
    }
  }
  for (const e of data.events) if (isDate(e.date)) dates.push(e.date);

  if (dates.length === 0) {
    return (
      <div className="page">
        <section className="card">
          <h2>Timeline</h2>
          <p className="muted">
            No dates yet. Open a room, expand a task and set its planned start and end dates. Tasks then appear here as bars.
          </p>
        </section>
      </div>
    );
  }

  dates.push(todayStr);
  dates.sort();
  const start = addDays(dates[0], -PAD_DAYS);
  const end = addDays(dates[dates.length - 1], PAD_DAYS);
  const totalDays = daysBetween(start, end) + 1;
  const dayWidth = Math.max(4, Math.min(36, Math.floor(900 / totalDays)));
  const width = totalDays * dayWidth;
  const x = (d: string) => daysBetween(start, d) * dayWidth;
  const barWidth = (a: string, b: string) => (daysBetween(a, b) + 1) * dayWidth;

  // Month labels and week lines (Mondays).
  const months: { left: number; label: string }[] = [];
  const weeks: number[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(start, i);
    const date = parseDate(d);
    if (i === 0 || date.getDate() === 1) {
      months.push({ left: i * dayWidth, label: date.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' }) });
    }
    if (date.getDay() === 1) weeks.push(i * dayWidth);
  }
  const showWeekDates = dayWidth >= 10;

  return (
    <div className="page">
      <section className="card">
        <h2>Timeline</h2>
        <div className="legend">
          <span>
            <i className="lg-planned" /> Planned
          </span>
          <span>
            <i className="lg-actual" /> Actual
          </span>
          <span>
            <i className="lg-today" /> Today
          </span>
          <span>
            <i className="lg-event" /> Appointment
          </span>
        </div>
        <div className="tl-scroll">
          <div className="tl" style={{ width: LABEL_WIDTH + width }}>
            <div className="tl-header" style={{ paddingLeft: LABEL_WIDTH }}>
              <div className="tl-months" style={{ width }}>
                {months.map((m) => (
                  <span key={m.left} style={{ left: m.left }}>
                    {m.label}
                  </span>
                ))}
              </div>
              <div className="tl-weeks" style={{ width }}>
                {weeks.map((w) => (
                  <span key={w} style={{ left: w }}>
                    {showWeekDates ? parseDate(addDays(start, w / dayWidth)).getDate() : ''}
                  </span>
                ))}
              </div>
            </div>

            <div className="tl-body">
              <div className="tl-grid" style={{ left: LABEL_WIDTH, width }}>
                {weeks.map((w) => (
                  <span key={w} style={{ left: w }} />
                ))}
                <span className="tl-today" style={{ left: x(todayStr) + dayWidth / 2 }} title="Today" />
              </div>

              {data.rooms.map((room, roomIndex) => {
                const color = roomColor(roomIndex);
                const roomEvents = data.events.filter((e) => e.roomId === room.id && isDate(e.date));
                return (
                  <div key={room.id} className="tl-room">
                    <div className="tl-row tl-room-row">
                      <button className="tl-label link" style={{ width: LABEL_WIDTH, color }} onClick={() => props.openRoom(room.id)}>
                        {room.name || '(unnamed)'}
                      </button>
                      <div className="tl-track" style={{ width }}>
                        {roomEvents.map((e) => (
                          <span
                            key={e.id}
                            className="tl-event"
                            style={{ left: x(e.date) + dayWidth / 2, background: color }}
                            title={`${e.date}${e.time ? ` ${e.time}` : ''} · ${e.title} (${EVENT_KIND_LABEL[e.kind]})`}
                          />
                        ))}
                      </div>
                    </div>
                    {room.tasks.map((t) => {
                      const p = plannedRange(t);
                      const a = actualRange(t, todayStr);
                      const issue = scheduleIssue(t, todayStr);
                      return (
                        <div key={t.id} className="tl-row">
                          <div className="tl-label" style={{ width: LABEL_WIDTH }} title={t.name}>
                            {t.name || '(unnamed)'}
                            {issue && <span className={`issue ${issue}`}>{ISSUE_LABEL[issue]}</span>}
                          </div>
                          <div className="tl-track" style={{ width }}>
                            {!p && !a && <span className="tl-nodates">no dates</span>}
                            {p && (
                              <button
                                className={`tl-bar planned${issue === 'overdue' ? ' overdue' : ''}`}
                                style={{ left: x(p.start), width: barWidth(p.start, p.end), borderColor: color }}
                                title={`Planned: ${prettyRange(p.start, p.end)} · ${t.percent}% done`}
                                onClick={() => props.openRoom(room.id)}
                              >
                                <span className="tl-fill" style={{ width: `${t.percent}%`, background: color }} />
                              </button>
                            )}
                            {a && (
                              <span
                                className="tl-bar actual"
                                style={{ left: x(a.start), width: barWidth(a.start, a.end), background: color }}
                                title={`Actual: ${prettyRange(a.start, a.end)}${t.status === 'done' ? '' : ' (in progress)'}`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {data.events.some((e) => e.roomId === '' || roomIndexOf(data.rooms, e.roomId) < 0) && (
                <div className="tl-row tl-room-row">
                  <div className="tl-label" style={{ width: LABEL_WIDTH }}>
                    Whole house
                  </div>
                  <div className="tl-track" style={{ width }}>
                    {data.events
                      .filter((e) => (e.roomId === '' || roomIndexOf(data.rooms, e.roomId) < 0) && isDate(e.date))
                      .map((e) => (
                        <span
                          key={e.id}
                          className="tl-event"
                          style={{ left: x(e.date) + dayWidth / 2, background: '#4b5563' }}
                          title={`${e.date}${e.time ? ` ${e.time}` : ''} · ${e.title} (${EVENT_KIND_LABEL[e.kind]})`}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="muted small">
          The outlined bar is the planned period and fills up with the task's completion. The thin solid bar under it is when the work
          actually happened. Click a bar or room name to open the room.
        </p>
      </section>
    </div>
  );
}
