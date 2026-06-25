/**
 * Sankey layout — port of SankeyModels.swift + RevenueFlowViewModel.swift.
 *
 * Adapted for the RN data model: income comes from recorded Income transactions
 * (grouped by title) and outflows from expense categories. Sales line-items and
 * sales tax (SaleTransaction) arrive in Phase 5, so there's no tax column yet;
 * the right column is expense categories + Retained.
 */

import { withOpacity } from '@/lib/color';
import type { Expense } from '@/models/expense';
import type { Transaction } from '@/models/transaction';

export const SANKEY_REVENUE = '#6680F2';

export interface SankeyNode {
  id: string;
  label: string;
  amount: number;
  color: string;
  column: number; // 0 = income, 1 = center, 2 = outflows
  rect: { x: number; y: number; width: number; height: number };
}

export interface SankeyLink {
  id: string;
  amount: number;
  color: string;
  sourceX: number;
  targetX: number;
  sourceYStart: number;
  sourceBandHeight: number;
  targetYStart: number;
  targetBandHeight: number;
}

export interface SankeyLayout {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface FlowGroup {
  name: string;
  amount: number;
  color: string;
}

/** Expense-category colors — port of the ExpenseCategory.color extension. */
const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Supplies: '#FF6B6B',
  Rent: '#4FCCC4',
  Utilities: '#FFD93D',
  Equipment: '#6BCC78',
  Marketing: '#855EC2',
  Insurance: '#00C9A6',
  Payroll: '#C24A36',
  'Professional Services': '#4D96FF',
  Travel: '#FAA826',
  Maintenance: '#FF8066',
  Software: '#7D82FC',
  Other: '#8F8F94',
};

export function expenseCategoryColor(name: string): string {
  return EXPENSE_CATEGORY_COLORS[name] ?? '#8E8E93';
}

const INCOME_PALETTE = ['#34C759', '#30B0C7', '#5856D6', '#AF52DE', '#FF9500', '#FF2D55', '#00C7BE'];

/** Group Income transactions by title; collapse tiny (<3%) sources, cap at 7. */
export function groupIncomeSources(transactions: Transaction[]): FlowGroup[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.category !== 'Income') continue;
    map.set(t.title || 'Other Sales', (map.get(t.title || 'Other Sales') ?? 0) + t.amount);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  const threshold = total * 0.03;
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);

  let collapsed: { name: string; amount: number }[] = [];
  let other = 0;
  for (const [name, amount] of sorted) {
    if (amount < threshold) other += amount;
    else collapsed.push({ name, amount });
  }
  if (other > 0) collapsed.push({ name: 'Other Services', amount: other });
  if (collapsed.length > 7) {
    const keep = collapsed.slice(0, 6);
    const rest = collapsed.slice(6).reduce((s, x) => s + x.amount, 0);
    collapsed = [...keep, { name: 'Other Services', amount: rest }];
  }
  return collapsed.map((c, i) => ({
    name: c.name,
    amount: c.amount,
    color: c.name === 'Other Services' ? '#8E8E93' : INCOME_PALETTE[i % INCOME_PALETTE.length],
  }));
}

/** Group expenses by category, sorted desc. */
export function groupExpenseCategories(expenses: Expense[]): FlowGroup[] {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount, color: expenseCategoryColor(name) }));
}

function positionColumn(
  nodes: SankeyNode[],
  x: number,
  width: number,
  totalHeight: number,
  gap: number,
  columnTotal: number,
) {
  if (nodes.length === 0 || columnTotal <= 0) return;
  const totalGap = gap * (nodes.length - 1);
  const usableH = totalHeight - totalGap;
  let currentY = 0;
  for (const n of nodes) {
    const h = Math.max((n.amount / columnTotal) * usableH, 2);
    n.rect = { x, y: currentY, width, height: h };
    currentY += h + gap;
  }
}

export function buildSankeyLayout(opts: {
  incomeSources: FlowGroup[];
  expenseGroups: FlowGroup[];
  width: number;
  height: number;
  compact: boolean;
}): SankeyLayout {
  const { incomeSources, expenseGroups, width, height, compact } = opts;
  const totalIncome = incomeSources.reduce((s, x) => s + x.amount, 0);
  const totalExpenses = expenseGroups.reduce((s, x) => s + x.amount, 0);
  const retained = Math.max(totalIncome - totalExpenses, 0);
  if (totalIncome <= 0) return { nodes: [], links: [] };

  const nodeWidth = compact ? 6 : 8;
  const hPadding = compact ? 20 : 90;
  const drawW = width - hPadding * 2;
  const col0X = hPadding;
  const col1X = hPadding + (drawW - nodeWidth) / 2;
  const col2X = hPadding + drawW - nodeWidth;
  const gap = compact ? 3 : 4;

  const mk = (id: string, g: FlowGroup, column: number): SankeyNode => ({
    id, label: g.name, amount: g.amount, color: g.color, column, rect: { x: 0, y: 0, width: 0, height: 0 },
  });

  const leftNodes = incomeSources.map((s) => mk(`inc:${s.name}`, s, 0));
  positionColumn(leftNodes, col0X, nodeWidth, height, gap, totalIncome);

  const centerNodes = [mk('center', { name: 'Total Revenue', amount: totalIncome, color: SANKEY_REVENUE }, 1)];
  positionColumn(centerNodes, col1X, nodeWidth, height, gap, totalIncome);

  const rightNodes = expenseGroups.map((g) => mk(`exp:${g.name}`, g, 2));
  if (retained > 0) rightNodes.push(mk('exp:Retained', { name: 'Retained', amount: retained, color: SANKEY_REVENUE }, 2));
  const rightTotal = rightNodes.reduce((s, n) => s + n.amount, 0);
  positionColumn(rightNodes, col2X, nodeWidth, height, gap, rightTotal);

  const links: SankeyLink[] = [];
  const center = centerNodes[0];

  let centerInY = center.rect.y;
  for (const src of leftNodes) {
    const targetH = (src.amount / totalIncome) * center.rect.height;
    links.push({
      id: `l:${src.id}->center`, amount: src.amount, color: src.color,
      sourceX: col0X + nodeWidth, targetX: col1X,
      sourceYStart: src.rect.y, sourceBandHeight: src.rect.height,
      targetYStart: centerInY, targetBandHeight: targetH,
    });
    centerInY += targetH;
  }

  let centerOutY = center.rect.y;
  for (const dest of rightNodes) {
    const sourceH = (dest.amount / totalIncome) * center.rect.height;
    links.push({
      id: `l:center->${dest.id}`, amount: dest.amount, color: dest.color,
      sourceX: col1X + nodeWidth, targetX: col2X,
      sourceYStart: centerOutY, sourceBandHeight: sourceH,
      targetYStart: dest.rect.y, targetBandHeight: dest.rect.height,
    });
    centerOutY += sourceH;
  }

  return { nodes: [...leftNodes, ...centerNodes, ...rightNodes], links };
}

/** Band fill gradient stops used by the renderer (port of RefinedSankeyView). */
export function bandGradientStops(color: string) {
  return [
    { offset: '0', color: withOpacity(color, 0.38) },
    { offset: '0.35', color: withOpacity(color, 0.22) },
    { offset: '0.65', color: withOpacity(color, 0.18) },
    { offset: '1', color: withOpacity(color, 0.3) },
  ];
}
