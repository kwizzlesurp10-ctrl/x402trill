import type { ComplianceInput } from './types';
import type { ComplianceResult } from './types';

function clampScore(n: number): number {
  return Math.max(58, Math.min(96, n));
}

export function generateMockResults(input: ComplianceInput): ComplianceResult {
  const { industry, employeeCount } = input;
  let baseScore = 82;
  let items: { requirement: string; passed: boolean }[] = [];
  let actions: string[] = [];

  if (industry.toLowerCase().includes('food') || industry.toLowerCase().includes('restaurant')) {
    baseScore = 71;
    items = [
      { requirement: "Food Handler's Permit", passed: true },
      { requirement: "Workers' Compensation Insurance", passed: employeeCount > 0 },
      { requirement: "Sales Tax Permit", passed: true },
    ];

    actions = ["Renew health permit", "Check workers comp requirements"];
  } else {
    items = [
      { requirement: "Register with MN Secretary of State", passed: true },
      { requirement: "Obtain workers compensation insurance", passed: employeeCount > 0 },
      { requirement: "Data privacy compliance", passed: !input.handlesPersonalData || true },
    ];
    actions = ["Review data handling policies"];
  }

  return {
    overallScore: clampScore(baseScore),
    summary: `Your business shows ${baseScore > 75 ? 'good' : 'moderate'} compliance.`,
    categories: [
      { name: "Employment", score: clampScore(baseScore + 5), status: "compliant", notes: "Basic requirements met" },
      { name: "Data Privacy", score: clampScore(baseScore - 10), status: "warning", notes: "Review policies" },
    ],
    checklist: items,
    recommendations: actions,
  };
}
