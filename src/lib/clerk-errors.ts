// Maps Clerk's raw error codes/messages to user-friendly copy.
// Keeps auth forms from ever showing Clerk's internal wording directly to end users.

interface ClerkLikeError {
  code?: string;
  message?: string;
  longMessage?: string;
}

export function getFriendlyAuthErrorMessage(error: ClerkLikeError | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";

  const code = error.code ?? "";
  const text = `${error.message ?? ""} ${error.longMessage ?? ""}`.toLowerCase();

  // Breached / pwned password — never show Clerk's raw wording.
  if (
    code === "form_password_pwned" ||
    text.includes("breach") ||
    text.includes("pwned")
  ) {
    return "For your security, this password has been used in a known data breach. Please choose a different, unique password that you haven't used before — avoid reusing an old password.";
  }

  if (code === "form_password_length_too_short" || text.includes("length")) {
    return "Your password is too short. Please use at least 8 characters.";
  }

  if (code === "form_identifier_exists" || text.includes("already") || text.includes("taken")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (code === "form_param_format_invalid" || text.includes("email") && text.includes("valid")) {
    return "Please enter a valid email address.";
  }

  if (code === "form_code_incorrect" || text.includes("incorrect") || text.includes("invalid") && text.includes("code")) {
    return "That verification code is incorrect. Please check your email and try again.";
  }

  if (code === "verification_expired" || text.includes("expired")) {
    return "This verification code has expired. Please request a new one.";
  }

  if (text.includes("too many") || text.includes("rate")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // Fall back to Clerk's own message when we don't have a specific mapping —
  // Clerk's default messages are generally user-safe, just not always on-brand.
  return error.message || "Something went wrong. Please try again.";
}
