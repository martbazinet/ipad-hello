import { useState } from 'react';
import type { AppData, Quote, QuoteType, Room, Settings, Task, TaskStatus } from '../types';
import {
  QUOTE_TYPE_LABEL,
  acceptedSplit,
  doubleMaterialWarning,
  hasLabor,
  money,
  progressOf,
  quoteTotal,
  roomCosts,
  taskCosts,
  withTax,
} from '../calc';
import type { Updater } from '../store';
import { findRoom, findTask, newQuote, newTask } from '../store';
import { allAttachments, deleteFile } from '../storage';
import { daysBetween, isDate, prettyDate, prettyRange, today } from '../dates';
import { ISSUE_LABEL, endSlip, plannedRange, scheduleIssue } from '../schedule';
import { AddForm, MoneyField, ProgressBar, TextField } from './fields';
import { Attachments } from './Attachments';
import { CostSummary } from './CostSummary';

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
};

export function RoomView(props: { data: AppData; roomId: string; update: Updater; back: () => void }) {
  const room = props.data.rooms.find((r) => r.id === props.roomId);
  if (!room) {
    return (
      <div className="page">
        <p>This room no longer exists.</p>
        <button onClick={props.back}>Back to dashboard</button>
      </div>
    );
  }

  const updateRoom = (fn: (r: Room) => void) => props.update((d) => fn(findRoom(d, room.id)));

  const deleteRoom = () => {
    if (!confirm(`Delete "${room.name}" with its ${room.tasks.length} task(s), quotes and files? This cannot be undone.`)) return;
    allAttachments([room]).forEach((a) => deleteFile(a.id).catch(() => undefined));
    props.update((d) => {
      d.rooms = d.rooms.filter((r) => r.id !== room.id);
      // Keep the room's appointments, but move them to the whole house.
      for (const e of d.events) if (e.roomId === room.id) e.roomId = '';
    });
    props.back();
  };

  return (
    <div className="page">
      <button className="link" onClick={props.back}>
        ← All rooms
      </button>

      <section className="card">
        <div className="row-between">
          <TextField label="Room" value={room.name} onChange={(v) => updateRoom((r) => void (r.name = v))} />
          <button className="danger" onClick={deleteRoom}>
            Delete room
          </button>
        </div>
        <ProgressBar percent={progressOf(room.tasks)} />
        <CostSummary costs={roomCosts(room)} settings={props.data.settings} />
        <TextField label="Notes" multiline value={room.notes} onChange={(v) => updateRoom((r) => void (r.notes = v))} />
        <h3>Room photos and documents</h3>
        <Attachments items={room.attachments} onChange={(a) => updateRoom((r) => void (r.attachments = a))} />
      </section>

      <section>
        <h2>Tasks</h2>
        {room.tasks.length === 0 && <p className="muted">No tasks yet. Add one, for example "Demolition", "Flooring" or "Plumbing".</p>}
        {room.tasks.map((t) => (
          <TaskCard key={t.id} task={t} roomId={room.id} settings={props.data.settings} update={props.update} />
        ))}
        <AddForm
          placeholder="New task name"
          button="Add task"
          onAdd={(name) => updateRoom((r) => void r.tasks.push(newTask(name)))}
        />
      </section>
    </div>
  );
}

function TaskCard(props: { task: Task; roomId: string; settings: Settings; update: Updater }) {
  const { task, settings } = props;
  const [open, setOpen] = useState(task.quotes.length === 0 && task.estMaterial + task.estLabor === 0);
  const c = taskCosts(task);
  const accepted = acceptedSplit(task);
  const warning = doubleMaterialWarning(task);
  const todayStr = today();
  const issue = scheduleIssue(task, todayStr);
  const planned = plannedRange(task);
  const slip = task.status === 'done' ? endSlip(task) : null;

  const updateTask = (fn: (t: Task) => void) => props.update((d) => fn(findTask(d, props.roomId, task.id)));

  /** Fill in actual dates when work starts or finishes, unless already set. */
  const stampDates = (t: Task, prev: TaskStatus) => {
    if (t.status !== 'not_started' && !t.actualStart) t.actualStart = todayStr;
    if (t.status === 'done' && !t.actualEnd) t.actualEnd = todayStr;
    // Reopening a finished task: it isn't finished any more.
    if (prev === 'done' && t.status !== 'done') t.actualEnd = '';
  };

  const setStatus = (status: TaskStatus) =>
    updateTask((t) => {
      const prev = t.status;
      t.status = status;
      if (status === 'done') t.percent = 100;
      if (status === 'not_started') t.percent = 0;
      if (status === 'in_progress' && (t.percent === 0 || t.percent === 100)) t.percent = 10;
      stampDates(t, prev);
    });

  const setPercent = (p: number) =>
    updateTask((t) => {
      const prev = t.status;
      t.percent = p;
      t.status = p >= 100 ? 'done' : p > 0 ? 'in_progress' : 'not_started';
      stampDates(t, prev);
    });

  const setDate = (key: 'plannedStart' | 'plannedEnd' | 'actualStart' | 'actualEnd', value: string) =>
    updateTask((t) => {
      t[key] = value;
      // Picking a start after the planned end moves the end along with it.
      if (key === 'plannedStart' && value && t.plannedEnd && t.plannedEnd < value) t.plannedEnd = value;
    });

  const deleteTask = () => {
    if (!confirm(`Delete task "${task.name}" with its quotes and files?`)) return;
    [...task.attachments, ...task.quotes.flatMap((q) => q.attachments)].forEach((a) => deleteFile(a.id).catch(() => undefined));
    props.update((d) => {
      const r = findRoom(d, props.roomId);
      r.tasks = r.tasks.filter((t) => t.id !== task.id);
    });
  };

  return (
    <div className={`card task status-${task.status}`}>
      <div className="task-head" onClick={() => setOpen(!open)}>
        <span className="chevron">{open ? '▾' : '▸'}</span>
        <strong className="task-name">{task.name || '(unnamed)'}</strong>
        {planned && <span className="task-dates muted small">{prettyRange(planned.start, planned.end)}</span>}
        {issue && <span className={`issue ${issue}`}>{ISSUE_LABEL[issue]}</span>}
        <span className={`badge ${task.status}`}>{STATUS_LABEL[task.status]}</span>
        <span className="task-progress">
          <ProgressBar percent={task.percent} />
        </span>
        <span className="task-money" title="Forecast, with tax">
          {money(withTax(c.forecast, settings))}
        </span>
      </div>

      {open && (
        <div className="task-body">
          <div className="grid">
            <TextField label="Task" value={task.name} onChange={(v) => updateTask((t) => void (t.name = v))} />
            <label className="field">
              <span>Status</span>
              <select value={task.status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Completion: {task.percent}%</span>
              <input type="range" min={0} max={100} step={5} value={task.percent} onChange={(e) => setPercent(Number(e.target.value))} />
            </label>
          </div>

          <h4>Schedule</h4>
          <div className="date-grid">
            <div />
            <div className="col-head">Start</div>
            <div className="col-head">End</div>
            <div className="col-head">Duration</div>

            <div className="row-head">Planned</div>
            <DateInput label="Planned start" value={task.plannedStart} onChange={(v) => setDate('plannedStart', v)} />
            <DateInput label="Planned end" value={task.plannedEnd} min={task.plannedStart} onChange={(v) => setDate('plannedEnd', v)} />
            <div className="readonly">{durationText(task.plannedStart, task.plannedEnd)}</div>

            <div className="row-head">Actual</div>
            <DateInput label="Actual start" value={task.actualStart} onChange={(v) => setDate('actualStart', v)} />
            <DateInput label="Actual end" value={task.actualEnd} min={task.actualStart} onChange={(v) => setDate('actualEnd', v)} />
            <div className="readonly">{durationText(task.actualStart, task.actualEnd)}</div>
          </div>
          {issue === 'overdue' && <p className="warning">⚠ The planned end date has passed and the task isn't done.</p>}
          {issue === 'late_start' && <p className="warning">⚠ The planned start date has passed and the task hasn't started.</p>}
          {issue === 'bad_dates' && <p className="warning">⚠ An end date is before its start date.</p>}
          {slip !== null && slip !== 0 && (
            <p className={`small ${slip > 0 ? 'over' : 'under'}`}>
              Finished {Math.abs(slip)} day{Math.abs(slip) === 1 ? '' : 's'} {slip > 0 ? 'later' : 'earlier'} than planned.
            </p>
          )}
          <p className="muted small">Actual dates fill in automatically when you start or finish the task. You can change them.</p>

          <h4>Costs (before tax)</h4>
          <div className="cost-grid">
            <div />
            <div className="col-head">Material</div>
            <div className="col-head">Labor</div>
            <div className="col-head">Total</div>

            <div className="row-head">Estimate</div>
            <MoneyField label="" value={task.estMaterial} onChange={(n) => updateTask((t) => void (t.estMaterial = n))} />
            <MoneyField label="" value={task.estLabor} onChange={(n) => updateTask((t) => void (t.estLabor = n))} />
            <div className="total">{money(c.estimated)}</div>

            <div className="row-head">Accepted quotes</div>
            <div className="readonly">{accepted.count ? money(accepted.material) : '—'}</div>
            <div className="readonly">{accepted.count ? money(accepted.labor) : '—'}</div>
            <div className="total">{accepted.count ? money(c.quoted) : '—'}</div>

            <div className="row-head">Actual (spent)</div>
            <MoneyField label="" value={task.actualMaterial} onChange={(n) => updateTask((t) => void (t.actualMaterial = n))} />
            <MoneyField label="" value={task.actualLabor} onChange={(n) => updateTask((t) => void (t.actualLabor = n))} />
            <div className="total">{money(c.actual)}</div>
          </div>
          <p className="muted small">
            Forecast: {money(c.forecast)} before tax, {money(withTax(c.forecast, settings))} with tax. Material includes supplier and
            rental quotes.
          </p>
          {warning && <p className="warning">⚠ {warning}</p>}

          <h4>Quotes ({task.quotes.length})</h4>
          <p className="muted small">You can accept one contractor, one supplier and one rental quote per task.</p>
          {task.quotes.map((q) => (
            <QuoteCard key={q.id} quote={q} task={task} settings={settings} updateTask={updateTask} />
          ))}
          <div className="row">
            {(Object.keys(QUOTE_TYPE_LABEL) as QuoteType[]).map((type) => (
              <button key={type} onClick={() => updateTask((t) => void t.quotes.push(newQuote(type)))}>
                + {QUOTE_TYPE_LABEL[type]} quote
              </button>
            ))}
          </div>

          <TextField label="Notes" multiline value={task.notes} onChange={(v) => updateTask((t) => void (t.notes = v))} />
          <h4>Task photos and documents</h4>
          <Attachments items={task.attachments} onChange={(a) => updateTask((t) => void (t.attachments = a))} />

          <div className="row-end">
            <button className="danger" onClick={deleteTask}>
              Delete task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Date input that saves as soon as a date is picked or cleared. */
function DateInput(props: { label: string; value: string; min?: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      aria-label={props.label}
      value={props.value}
      min={props.min || undefined}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || isDate(v)) props.onChange(v);
      }}
    />
  );
}

function durationText(start: string, end: string) {
  if (!isDate(start) || !isDate(end) || end < start) return '—';
  const days = daysBetween(start, end) + 1;
  return `${days} day${days === 1 ? '' : 's'}`;
}

const DESCRIPTION_PLACEHOLDER: Record<QuoteType, string> = {
  contractor: 'e.g. Remove old tile, install new floor and wall tile, grout and seal',
  supplier: 'e.g. Porcelain tile 12×24, grey, 220 sq ft + thinset and grout',
  rental: 'e.g. 20-yard dumpster, 7 days',
};

/** Which part of the task estimate a quote should be compared with. */
function comparableEstimate(q: Quote, t: Task): { amount: number; label: string } | null {
  if (q.type === 'rental') return null;
  if (q.type === 'supplier') return { amount: t.estMaterial, label: 'material estimate' };
  if (q.material > 0) return { amount: t.estMaterial + t.estLabor, label: 'estimate' };
  return { amount: t.estLabor, label: 'labor estimate' };
}

function QuoteCard(props: { quote: Quote; task: Task; settings: Settings; updateTask: (fn: (t: Task) => void) => void }) {
  const { quote: q } = props;
  const total = quoteTotal(q);
  const typeLabel = QUOTE_TYPE_LABEL[q.type];
  const compare = comparableEstimate(q, props.task);
  const diff = compare ? total - compare.amount : 0;

  const updateQuote = (fn: (q: Quote) => void) =>
    props.updateTask((t) => {
      const found = t.quotes.find((x) => x.id === q.id);
      if (found) fn(found);
    });

  /** Accepting replaces any other accepted quote of the same type only. */
  const accept = () =>
    props.updateTask((t) => {
      for (const x of t.quotes) {
        if (x.id === q.id) x.status = 'accepted';
        else if (x.type === q.type && x.status === 'accepted') x.status = 'pending';
      }
    });

  const changeType = (type: QuoteType) => {
    if (!hasLabor(type) && q.labor > 0) {
      if (!confirm(`${QUOTE_TYPE_LABEL[type]} quotes have no labor. Remove the ${money(q.labor)} labor amount from this quote?`)) return;
    }
    props.updateTask((t) => {
      const x = t.quotes.find((y) => y.id === q.id);
      if (!x) return;
      x.type = type;
      if (!hasLabor(type)) x.labor = 0;
      // Keep the one-accepted-per-type rule.
      if (x.status === 'accepted' && t.quotes.some((y) => y.id !== x.id && y.type === type && y.status === 'accepted')) {
        x.status = 'pending';
      }
    });
  };

  const remove = () => {
    if (!confirm(`Delete the ${typeLabel.toLowerCase()} quote from ${q.contractor || 'this company'}?`)) return;
    q.attachments.forEach((a) => deleteFile(a.id).catch(() => undefined));
    props.updateTask((t) => {
      t.quotes = t.quotes.filter((x) => x.id !== q.id);
    });
  };

  return (
    <div className={`quote quote-${q.status} quote-type-${q.type}`}>
      <div className="quote-title">
        <span className={`type-badge ${q.type}`}>{typeLabel}</span>
        <strong>{q.contractor || `New ${typeLabel.toLowerCase()} quote`}</strong>
        {q.description && <span className="quote-desc">{q.description}</span>}
      </div>
      <TextField
        label="Product / work description"
        value={q.description}
        placeholder={DESCRIPTION_PLACEHOLDER[q.type]}
        onChange={(v) => updateQuote((x) => void (x.description = v))}
      />
      <div className="grid">
        <label className="field">
          <span>Type</span>
          <select value={q.type} onChange={(e) => changeType(e.target.value as QuoteType)}>
            {(Object.keys(QUOTE_TYPE_LABEL) as QuoteType[]).map((t) => (
              <option key={t} value={t}>
                {QUOTE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label={q.type === 'supplier' ? 'Store / supplier' : q.type === 'rental' ? 'Rental company' : 'Company'}
          value={q.contractor}
          onChange={(v) => updateQuote((x) => void (x.contractor = v))}
        />
        <TextField label="Contact (phone / email)" value={q.contact} onChange={(v) => updateQuote((x) => void (x.contact = v))} />
        <label className="field">
          <span>Quote date</span>
          <DateInput label="Quote date" value={q.date} onChange={(v) => updateQuote((x) => void (x.date = v))} />
        </label>
        <label className="field">
          <span>Valid until</span>
          <DateInput label="Valid until" value={q.validUntil} min={q.date} onChange={(v) => updateQuote((x) => void (x.validUntil = v))} />
        </label>
        <MoneyField
          label={q.type === 'contractor' ? 'Material (before tax)' : q.type === 'supplier' ? 'Materials (before tax)' : 'Rental amount (before tax)'}
          value={q.material}
          onChange={(n) => updateQuote((x) => void (x.material = n))}
        />
        {hasLabor(q.type) && (
          <MoneyField label="Labor (before tax)" value={q.labor} onChange={(n) => updateQuote((x) => void (x.labor = n))} />
        )}
        <div className="field">
          <span>Total</span>
          <div className="readonly">
            {money(total)} <span className="muted small">({money(withTax(total, props.settings))} with tax)</span>
          </div>
          {compare && compare.amount > 0 && total > 0 && (
            <span className={`small ${diff > 0 ? 'over' : 'under'}`}>
              {money(Math.abs(diff))} {diff > 0 ? 'above' : 'below'} {compare.label}
            </span>
          )}
        </div>
      </div>
      <TextField label="Notes (scope, warranty, timeline…)" multiline value={q.notes} onChange={(v) => updateQuote((x) => void (x.notes = v))} />
      <Attachments items={q.attachments} onChange={(a) => updateQuote((x) => void (x.attachments = a))} />
      <div className="quote-actions">
        <span className={`badge ${q.status}`}>{q.status[0].toUpperCase() + q.status.slice(1)}</span>
        {q.status === 'pending' && isDate(q.validUntil) && (
          <span className={`issue ${q.validUntil < today() ? 'overdue' : 'late_start'}`}>
            {q.validUntil < today() ? `Expired ${prettyDate(q.validUntil)}` : `Valid until ${prettyDate(q.validUntil)}`}
          </span>
        )}
        {q.status !== 'accepted' && <button onClick={accept}>Accept</button>}
        {q.status === 'accepted' && <button onClick={() => updateQuote((x) => void (x.status = 'pending'))}>Un-accept</button>}
        {q.status !== 'rejected' && <button onClick={() => updateQuote((x) => void (x.status = 'rejected'))}>Reject</button>}
        {q.status === 'rejected' && <button onClick={() => updateQuote((x) => void (x.status = 'pending'))}>Restore</button>}
        <button className="danger" onClick={remove}>
          Delete
        </button>
      </div>
    </div>
  );
}
