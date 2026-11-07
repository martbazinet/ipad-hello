import type { AppData } from '../types';
import { houseCosts, money, progressOf, roomCosts, withTax } from '../calc';
import type { Updater } from '../store';
import { newRoom } from '../store';
import { AddForm, ProgressBar } from './fields';
import { addDays, prettyDate, prettyRange, today } from '../dates';
import { ISSUE_LABEL, allTasks as allTaskRefs, pendingExpiries, plannedRange, roomColor, scheduleIssue, upcoming } from '../schedule';
import { CostSummary } from './CostSummary';

function ScheduleSummary(props: { data: AppData; openRoom: (id: string) => void; openCalendar: () => void }) {
  const todayStr = today();
  const refs = allTaskRefs(props.data.rooms);
  const problems = refs
    .map((r) => ({ ...r, issue: scheduleIssue(r.task, todayStr) }))
    .filter((r): r is typeof r & { issue: NonNullable<typeof r.issue> } => r.issue !== null);
  const expired = pendingExpiries(props.data.rooms).filter((x) => x.quote.validUntil < todayStr);
  const soon = upcoming(props.data, todayStr, addDays(todayStr, 14));
  const ends = refs.map(({ task }) => plannedRange(task)?.end).filter((d): d is string => !!d);
  const finish = ends.length ? ends.sort()[ends.length - 1] : null;
  const unscheduled = refs.filter(({ task }) => task.status !== 'done' && !plannedRange(task)).length;

  return (
    <section className="card">
      <div className="row-between">
        <h2>Schedule</h2>
        <button onClick={props.openCalendar}>Open calendar</button>
      </div>
      <div className="stats">
        <div>
          <span className="stat-label">Planned finish</span>
          <span className="stat-value">{finish ? prettyDate(finish, true) : '—'}</span>
        </div>
        <div>
          <span className="stat-label">Needs attention</span>
          <span className={`stat-value${problems.length + expired.length ? ' over' : ''}`}>{problems.length + expired.length}</span>
        </div>
        <div>
          <span className="stat-label">Tasks without dates</span>
          <span className="stat-value">{unscheduled}</span>
        </div>
      </div>

      {(problems.length > 0 || expired.length > 0) && (
        <>
          <h4>Needs attention</h4>
          <ul className="upcoming">
            {problems.map(({ room, roomIndex, task, issue }) => (
              <li key={task.id}>
                <span className={`issue ${issue}`}>{ISSUE_LABEL[issue]}</span>
                <span className="up-dot" style={{ background: roomColor(roomIndex) }} />
                <button className="link" onClick={() => props.openRoom(room.id)}>
                  {task.name}
                </button>
                <span className="muted small">
                  {room.name}
                  {plannedRange(task) && ` · planned ${prettyRange(plannedRange(task)!.start, plannedRange(task)!.end)}`}
                </span>
              </li>
            ))}
            {expired.map(({ room, roomIndex, task, quote }) => (
              <li key={quote.id}>
                <span className="issue overdue">Quote expired</span>
                <span className="up-dot" style={{ background: roomColor(roomIndex) }} />
                <button className="link" onClick={() => props.openRoom(room.id)}>
                  {quote.contractor || 'Unnamed'} ({prettyDate(quote.validUntil)})
                </button>
                <span className="muted small">
                  {room.name} · {task.name}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h4>Next 14 days</h4>
      {soon.length === 0 ? (
        <p className="muted small">Nothing scheduled in the next 14 days.</p>
      ) : (
        <ul className="upcoming">
          {soon.map((i, n) => (
            <li key={n}>
              <span className="up-date">{prettyDate(i.date)}</span>
              <span className="up-dot" style={{ background: i.color }} />
              <button className="link" onClick={() => (i.event || !i.roomId ? props.openCalendar() : props.openRoom(i.roomId))}>
                {i.label}
              </button>
              <span className="muted small">{i.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Dashboard(props: { data: AppData; update: Updater; openRoom: (id: string) => void; openCalendar: () => void }) {
  const { rooms, settings } = props.data;
  const allTasks = rooms.flatMap((r) => r.tasks);
  const done = allTasks.filter((t) => t.status === 'done').length;

  return (
    <div className="page">
      <section className="card">
        <h2>Whole house</h2>
        <div className="stats">
          <div>
            <span className="stat-label">Rooms</span>
            <span className="stat-value">{rooms.length}</span>
          </div>
          <div>
            <span className="stat-label">Tasks done</span>
            <span className="stat-value">
              {done} / {allTasks.length}
            </span>
          </div>
          <div className="stat-grow">
            <span className="stat-label">Overall progress</span>
            <ProgressBar percent={progressOf(allTasks)} />
          </div>
        </div>
        <CostSummary costs={houseCosts(rooms)} settings={settings} />
      </section>

      <ScheduleSummary data={props.data} openRoom={props.openRoom} openCalendar={props.openCalendar} />

      <section className="card">
        <h2>Rooms</h2>
        {rooms.length === 0 ? (
          <p className="muted">No rooms yet. Add your first room below, for example "Kitchen" or "Main bathroom".</p>
        ) : (
          <div className="table-wrap">
            <table className="rooms">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Tasks</th>
                  <th>Progress</th>
                  <th>Estimated</th>
                  <th>Accepted quotes</th>
                  <th>Actual</th>
                  <th>Forecast (with tax)</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => {
                  const c = roomCosts(r);
                  return (
                    <tr key={r.id} className="clickable" onClick={() => props.openRoom(r.id)}>
                      <td>
                        <button className="link">{r.name || '(unnamed)'}</button>
                      </td>
                      <td>{r.tasks.length}</td>
                      <td className="progress-cell">
                        <ProgressBar percent={progressOf(r.tasks)} />
                      </td>
                      <td>{money(c.estimated)}</td>
                      <td>{money(c.quoted)}</td>
                      <td>{money(c.actual)}</td>
                      <td>{money(withTax(c.forecast, settings))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <AddForm
          placeholder="New room name"
          button="Add room"
          onAdd={(name) => {
            const room = newRoom(name);
            props.update((d) => {
              d.rooms.push(room);
            });
            props.openRoom(room.id);
          }}
        />
        <p className="muted small">Amounts in the rooms table are before tax unless marked.</p>
      </section>
    </div>
  );
}
