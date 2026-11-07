import type { Quote, QuoteType, Room, Settings, Task } from './types';

export interface Costs {
  estimated: number;
  /** Sum of accepted quotes. Tasks without an accepted quote contribute 0. */
  quoted: number;
  actual: number;
  /** Best current figure; see taskCosts. */
  forecast: number;
}

export const ZERO: Costs = { estimated: 0, quoted: 0, actual: 0, forecast: 0 };

export const QUOTE_TYPE_LABEL: Record<QuoteType, string> = {
  contractor: 'Contractor',
  supplier: 'Supplier',
  rental: 'Rental',
};

/** Supplier and rental quotes have a single amount, stored as material. */
export const hasLabor = (type: QuoteType) => type === 'contractor';

export const quoteTotal = (q: Quote) => q.material + q.labor;

/** Accepted quotes on a task: at most one per type. */
export const acceptedQuotes = (t: Task) => t.quotes.filter((q) => q.status === 'accepted');

/** Material and labor amounts summed over the accepted quotes. */
export function acceptedSplit(t: Task) {
  const acc = acceptedQuotes(t);
  return {
    count: acc.length,
    material: acc.reduce((s, q) => s + q.material, 0),
    labor: acc.reduce((s, q) => s + q.labor, 0),
    hasMaterial: acc.some((q) => q.material > 0),
    hasLabor: acc.some((q) => q.labor > 0),
  };
}

/**
 * Forecast, worked out separately for material and labor:
 * accepted quotes if any cover that part, otherwise the estimate.
 * Once the task is done and something was spent, the actual amount is used.
 * If more has already been spent than the forecast, the actual amount is used.
 */
export function taskCosts(t: Task): Costs {
  const estimated = t.estMaterial + t.estLabor;
  const a = acceptedSplit(t);
  const quoted = a.material + a.labor;
  const actual = t.actualMaterial + t.actualLabor;
  let forecast = (a.hasMaterial ? a.material : t.estMaterial) + (a.hasLabor ? a.labor : t.estLabor);
  if (t.status === 'done' && actual > 0) forecast = actual;
  else if (actual > forecast) forecast = actual;
  return { estimated, quoted, actual, forecast };
}

/**
 * Warning text when an accepted contractor quote includes materials and an
 * accepted supplier quote also covers materials, which may count them twice.
 */
export function doubleMaterialWarning(t: Task): string | null {
  const acc = acceptedQuotes(t);
  const contractor = acc.find((q) => q.type === 'contractor' && q.material > 0);
  const supplier = acc.find((q) => q.type === 'supplier' && q.material > 0);
  if (!contractor || !supplier) return null;
  return (
    `The accepted contractor quote (${contractor.contractor || 'unnamed'}) includes ${money(contractor.material)} of materials, ` +
    `and the accepted supplier quote (${supplier.contractor || 'unnamed'}) adds ${money(supplier.material)}. ` +
    `If the contractor's price already covers these materials, they are counted twice. ` +
    `Set the contractor's material amount to 0 or un-accept one of the quotes.`
  );
}

export function addCosts(a: Costs, b: Costs): Costs {
  return {
    estimated: a.estimated + b.estimated,
    quoted: a.quoted + b.quoted,
    actual: a.actual + b.actual,
    forecast: a.forecast + b.forecast,
  };
}

export const roomCosts = (r: Room) => r.tasks.map(taskCosts).reduce(addCosts, ZERO);
export const houseCosts = (rooms: Room[]) => rooms.map(roomCosts).reduce(addCosts, ZERO);

/** Average task completion, 0-100. Rooms with no tasks count as 0. */
export function progressOf(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round(tasks.reduce((s, t) => s + t.percent, 0) / tasks.length);
}

export function taxBreakdown(amount: number, s: Settings) {
  const gst = round2((amount * s.gstRate) / 100);
  const pst = round2((amount * s.pstRate) / 100);
  return { gst, pst, total: round2(amount + gst + pst) };
}

export const withTax = (amount: number, s: Settings) => taxBreakdown(amount, s).total;

const round2 = (n: number) => Math.round(n * 100) / 100;

const fmt = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
export const money = (n: number) => fmt.format(n);
