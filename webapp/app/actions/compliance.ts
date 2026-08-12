'use server';

import { complianceSchema } from '@/lib/compliance/schema';
import type { ComplianceResult } from '@/lib/compliance/types';
import { generateMockResults } from '@/lib/compliance/generate-mock-results';

export async function runComplianceCheck(
  input: unknown
): Promise<{ success: true; result: ComplianceResult } | { success: false; error: string }> {
  try {
    const validated = complianceSchema.parse(input);
    const result = generateMockResults(validated);
    return { success: true, result };
  } catch (error) {
    console.error('Compliance check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
