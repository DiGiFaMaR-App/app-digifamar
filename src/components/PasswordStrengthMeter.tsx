import { estimatePasswordStrength } from "@/lib/password-strength";

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const s = estimatePasswordStrength(password);
  const segments = 5;
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= s.score ? s.color : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Strength</span>
        <span className="font-medium">{s.label}</span>
      </div>
      {s.suggestions.length > 0 && s.score < 3 && (
        <ul className="text-xs text-muted-foreground list-disc pl-4">
          {s.suggestions.slice(0, 2).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
