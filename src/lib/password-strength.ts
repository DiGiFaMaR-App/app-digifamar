// Lightweight password strength estimator (no zxcvbn dep).
// Returns score 0-4 with label + suggestions.

export type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong";
  color: string; // tailwind class
  suggestions: string[];
};

export function estimatePasswordStrength(pw: string): Strength {
  const suggestions: string[] = [];
  let score = 0;

  if (pw.length >= 8) score++;
  else suggestions.push("Use at least 8 characters");
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  else suggestions.push("Mix upper and lowercase letters");
  if (/\d/.test(pw)) score++;
  else suggestions.push("Add a number");
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  else suggestions.push("Add a symbol");

  // common-pattern penalties
  if (/^(?:password|qwerty|letmein|admin|welcome|12345678)/i.test(pw)) score = Math.min(score, 1);
  if (/^(.)\1+$/.test(pw)) score = 0;

  const clamped = Math.max(0, Math.min(4, score - 1)) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];
  return {
    score: clamped,
    label: labels[clamped],
    color: colors[clamped],
    suggestions,
  };
}
