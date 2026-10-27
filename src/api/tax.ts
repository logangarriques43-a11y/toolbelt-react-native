/**
 * Tax API — AI tax analysis (POST /tax/ai-analysis), mirroring the Swift
 * TaxService.getAIAnalysis. Expense CRUD under /tax/expenses stays in
 * api/expenses.ts.
 *
 * The backend (taxRoutes, auth + 2FA-gated, 10 requests / 15 min) sends the
 * client-computed period summaries to Claude and returns structured advice.
 * Errors: 400 for a missing period/summary, 500 "AI service is not
 * configured" / "Failed to generate tax analysis" — surfaced via ApiError.
 */

import { api } from '@/lib/api-client';
import type { Expense } from '@/models/expense';
import type { SaleTransaction } from '@/models/sale';

export interface TransactionSummaryForAI {
  grossSales: number;
  transactionCount: number;
  taxCollected: number;
  topServices?: string[];
  /** Payment method → amount. */
  paymentMethodBreakdown?: Record<string, number>;
}

export interface ExpenseSummaryForAI {
  totalExpenses: number;
  deductibleExpenses: number;
  categoryBreakdown?: Record<string, number>;
}

export interface TaxAIAnalysis {
  analysis: string;
  recommendations: string[];
  estimatedLiability: number | null;
  deductionOpportunities: string[];
  filingDeadlines: string[];
  disclaimer: string | null;
}

interface TaxAIAnalysisDTO {
  analysis?: string | null;
  recommendations?: string[] | null;
  estimatedLiability?: number | null;
  deductionOpportunities?: string[] | null;
  filingDeadlines?: string[] | null;
  disclaimer?: string | null;
}

export async function getTaxAIAnalysis(input: {
  period: string;
  transactionSummary: TransactionSummaryForAI;
  expenseSummary?: ExpenseSummaryForAI;
  businessState?: string;
}): Promise<TaxAIAnalysis> {
  const d = await api.post<TaxAIAnalysisDTO>('/tax/ai-analysis', input);
  return {
    analysis: d?.analysis ?? '',
    recommendations: d?.recommendations ?? [],
    estimatedLiability: typeof d?.estimatedLiability === 'number' ? d.estimatedLiability : null,
    deductionOpportunities: d?.deductionOpportunities ?? [],
    filingDeadlines: d?.filingDeadlines ?? [],
    disclaimer: d?.disclaimer ?? null,
  };
}

/** Sales in the window → the transaction summary (TaxAIAnalysisView.runAnalysis). */
export function summarizeSales(sales: SaleTransaction[]): TransactionSummaryForAI {
  const methods: Record<string, number> = {};
  const services = new Set<string>();
  let gross = 0;
  let tax = 0;
  for (const s of sales) {
    gross += s.totalAmount;
    tax += s.taxAmount ?? 0;
    methods[s.paymentMethod] = (methods[s.paymentMethod] ?? 0) + s.totalAmount;
    if (s.items[0]?.name) services.add(s.items[0].name);
  }
  return {
    grossSales: round2(gross),
    transactionCount: sales.length,
    taxCollected: round2(tax),
    topServices: Array.from(services).slice(0, 5),
    paymentMethodBreakdown: mapValues(methods, round2),
  };
}

/** Expenses in the window → the expense summary. */
export function summarizeExpenses(expenses: Expense[]): ExpenseSummaryForAI {
  const cats: Record<string, number> = {};
  let total = 0;
  let deductible = 0;
  for (const e of expenses) {
    total += e.amount;
    if (e.isTaxDeductible) deductible += e.amount;
    cats[e.category] = (cats[e.category] ?? 0) + e.amount;
  }
  return {
    totalExpenses: round2(total),
    deductibleExpenses: round2(deductible),
    categoryBreakdown: mapValues(cats, round2),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function mapValues(o: Record<string, number>, f: (n: number) => number): Record<string, number> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));
}
