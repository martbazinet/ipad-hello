import type { Costs } from '../calc';
import { money, taxBreakdown } from '../calc';
import type { Settings } from '../types';
import { presetFor } from '../tax';

const ROWS: { key: keyof Costs; label: string; hint: string }[] = [
  { key: 'estimated', label: 'Estimated', hint: 'Your material + labor estimates' },
  { key: 'quoted', label: 'Accepted quotes', hint: 'Sum of accepted contractor, supplier and rental quotes' },
  { key: 'actual', label: 'Actual (spent)', hint: 'What you have actually paid' },
  {
    key: 'forecast',
    label: 'Forecast',
    hint: 'Per task, for material and labor separately: accepted quotes if any, else the estimate. Actual once done.',
  },
];

/** Estimated / quoted / actual / forecast, before tax, tax split, and total with tax. */
export function CostSummary({ costs, settings }: { costs: Costs; settings: Settings }) {
  const p = presetFor(settings.province);
  const hasPst = settings.pstRate > 0;
  const variance = costs.forecast - costs.estimated;

  return (
    <div className="table-wrap">
      <table className="costs">
        <thead>
          <tr>
            <th />
            <th>Before tax</th>
            <th>
              {p.gstLabel} {settings.gstRate}%
            </th>
            {hasPst && (
              <th>
                {p.pstLabel} {settings.pstRate}%
              </th>
            )}
            <th>With tax</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const amount = costs[r.key];
            const t = taxBreakdown(amount, settings);
            return (
              <tr key={r.key} className={r.key === 'forecast' ? 'strong' : undefined}>
                <th title={r.hint}>{r.label}</th>
                <td>{money(amount)}</td>
                <td>{money(t.gst)}</td>
                {hasPst && <td>{money(t.pst)}</td>}
                <td>{money(t.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {costs.estimated > 0 && (
        <p className={`variance ${variance > 0 ? 'over' : 'under'}`}>
          Forecast is {money(Math.abs(variance))} {variance > 0 ? 'over' : 'under'} the estimate (before tax)
          {` (${((variance / costs.estimated) * 100).toFixed(1)}%)`}.
        </p>
      )}
    </div>
  );
}
