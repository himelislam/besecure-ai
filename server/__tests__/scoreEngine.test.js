import { describe, it, expect } from 'vitest';
import { calculateScore, getGrade } from '../services/scoring/scoreEngine.js';

describe('calculateScore', () => {
  it('returns 100 / A+ for no findings', () => {
    const result = calculateScore([]);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A+');
    expect(result.breakdown).toEqual({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  });

  it('deducts 20 points for one critical finding', () => {
    const result = calculateScore([{ severity: 'critical' }]);
    expect(result.score).toBe(80);
    expect(result.grade).toBe('B');
    expect(result.breakdown.critical).toBe(1);
  });

  it('floors the score at 0 instead of going negative', () => {
    const findings = Array.from({ length: 10 }, () => ({ severity: 'critical' })); // 10 * 20 = 200
    const result = calculateScore(findings);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('applies mixed severity deductions and tallies the breakdown', () => {
    const findings = [
      { severity: 'critical' }, // -20
      { severity: 'high' }, // -10
      { severity: 'medium' }, // -5
      { severity: 'medium' }, // -5
      { severity: 'low' }, // -2
      { severity: 'info' }, // -0
    ];
    const result = calculateScore(findings);
    expect(result.score).toBe(58); // 100 - 20 - 10 - 5 - 5 - 2 - 0
    expect(result.grade).toBe('C');
    expect(result.breakdown).toEqual({ critical: 1, high: 1, medium: 2, low: 1, info: 1 });
  });

  it('ignores unknown severities for deduction but not for score', () => {
    const result = calculateScore([{ severity: 'unknown' }]);
    expect(result.score).toBe(100);
    expect(result.breakdown).toEqual({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  });
});

describe('getGrade', () => {
  it.each([
    [100, 'A+'],
    [95, 'A+'],
    [94, 'A'],
    [85, 'A'],
    [84, 'B'],
    [70, 'B'],
    [69, 'C'],
    [50, 'C'],
    [49, 'D'],
    [30, 'D'],
    [29, 'F'],
    [0, 'F'],
  ])('maps score %i to grade %s', (score, expected) => {
    expect(getGrade(score)).toBe(expected);
  });
});
