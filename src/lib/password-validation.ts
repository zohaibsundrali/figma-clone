// Password validation rules and utilities
export interface PasswordStrength {
  score: 0 | 1 | 2; // 0: Weak, 1: Medium, 2: Strong
  label: 'Weak' | 'Medium' | 'Strong';
  color: string;
}

export interface PasswordValidation {
  isValid: boolean;
  strength: PasswordStrength;
  rules: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

const PASSWORD_MIN_LENGTH = 8;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};:'",.<>?\/\\|`~]/;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;

export function validatePassword(password: string): PasswordValidation {
  const rules = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: UPPERCASE_REGEX.test(password),
    hasLowercase: LOWERCASE_REGEX.test(password),
    hasNumber: NUMBER_REGEX.test(password),
    hasSpecialChar: SPECIAL_CHAR_REGEX.test(password),
  };

  const rulesPassedCount = Object.values(rules).filter(Boolean).length;

  let strength: PasswordStrength;

  if (rulesPassedCount === 5) {
    strength = { score: 2, label: 'Strong', color: '#10b981' }; // Green
  } else if (rulesPassedCount >= 3) {
    strength = { score: 1, label: 'Medium', color: '#f59e0b' }; // Amber
  } else {
    strength = { score: 0, label: 'Weak', color: '#ef4444' }; // Red
  }

  const isValid =
    rules.minLength &&
    rules.hasUppercase &&
    rules.hasLowercase &&
    rules.hasNumber &&
    rules.hasSpecialChar;

  return {
    isValid,
    strength,
    rules,
  };
}

export function getPasswordRuleLabel(rule: keyof PasswordValidation['rules']): string {
  const labels: Record<keyof PasswordValidation['rules'], string> = {
    minLength: 'At least 8 characters',
    hasUppercase: 'At least one uppercase letter (A-Z)',
    hasLowercase: 'At least one lowercase letter (a-z)',
    hasNumber: 'At least one number (0-9)',
    hasSpecialChar: 'At least one special character (!@#$%^&* etc.)',
  };
  return labels[rule];
}
