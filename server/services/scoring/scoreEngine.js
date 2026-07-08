const SEVERITY_DEDUCTIONS = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  info: 0,
};

const GRADE_THRESHOLDS = [
  { min: 95, grade: 'A+' },
  { min: 85, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 50, grade: 'C' },
  { min: 30, grade: 'D' },
  { min: 0, grade: 'F' },
];

export function getGrade(score) {
  return GRADE_THRESHOLDS.find((t) => score >= t.min)?.grade ?? 'F';
}

export function calculateScore(findings) {
  const breakdown = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let score = 100;

  for (const finding of findings) {
    const severity = finding.severity;
    if (breakdown[severity] !== undefined) breakdown[severity] += 1;
    score -= SEVERITY_DEDUCTIONS[severity] ?? 0;
  }

  score = Math.max(0, score);

  return { score, grade: getGrade(score), breakdown };
}

// Projects the score if the given toolFindingIds were resolved — used by the
// roadmap generator (Phase 7) to estimate score impact per remediation step.
export function estimateScoreAfterFix(findings, fixedToolFindingIds = []) {
  const remaining = findings.filter((f) => !fixedToolFindingIds.includes(f.toolFindingId));
  return calculateScore(remaining);
}
