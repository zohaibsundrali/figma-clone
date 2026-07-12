"use client";

import { useState, useEffect, useMemo, useId } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { validatePassword, getPasswordRuleLabel, type PasswordValidation } from "@/lib/password-validation";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (validation: PasswordValidation) => void;
  placeholder?: string;
  label?: string;
  autoComplete?: string;
  error?: string;
  showRequirements?: boolean;
  disabled?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  onValidationChange,
  placeholder = "Password",
  label = "Password",
  autoComplete = "new-password",
  error,
  showRequirements = true,
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();

  // Memoize so identity only changes when the password value actually changes —
  // otherwise the effect below re-fires every render and loops with the parent's setState.
  const validation = useMemo(() => validatePassword(value), [value]);

  // Notify parent of validation changes after render (never during render).
  useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);

  const inputState: "empty" | "error" | "valid" | "partial" = error
    ? "error"
    : !value
    ? "empty"
    : validation.isValid
    ? "valid"
    : "partial";

  const borderClass = {
    empty: "border-white/10 focus-within:border-sky-400",
    error: "border-red-500/60",
    valid: "border-green-500/50",
    partial: "border-amber-500/40",
  }[inputState];

  return (
    <div className="space-y-2.5">
      <label htmlFor={inputId} className="block text-xs font-semibold text-white/85">
        {label}
      </label>

      {/* Password Input Field */}
      <div
        className={`flex items-center gap-2 rounded-lg border ${borderClass} bg-white/5 pr-2 transition-colors focus-within:ring-2 focus-within:ring-sky-400/20`}
      >
        <input
          id={inputId}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={inputState === "error"}
          aria-describedby={showRequirements ? `${inputId}-requirements` : undefined}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          disabled={disabled}
          className="rounded p-1.5 text-white/50 transition-colors hover:text-white/85 disabled:opacity-50"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Error message from Clerk or other sources */}
      {error && (
        <p className="text-xs font-medium text-red-400" role="alert">
          {error}
        </p>
      )}

      {showRequirements && value && (
        <div id={`${inputId}-requirements`} className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
          {/* Password Strength Indicator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/50">Password strength</span>
              <span className="text-[11px] font-bold" style={{ color: validation.strength.color }}>
                {validation.strength.label}
              </span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      index <= validation.strength.score ? validation.strength.color : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <div className="space-y-1.5 border-t border-white/10 pt-3">
            {Object.entries(validation.rules).map(([rule, passed]) => (
              <div key={rule} className="flex items-center gap-2 text-xs transition-colors">
                {passed ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-400" />
                ) : (
                  <X className="h-3.5 w-3.5 flex-shrink-0 text-white/30" />
                )}
                <span className={passed ? "text-white/80" : "text-white/45"}>
                  {getPasswordRuleLabel(rule as keyof typeof validation.rules)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
