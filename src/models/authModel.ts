// ═══════════════════════════════════════════════════════
// FinMatrix — Auth Validation Model
// ═══════════════════════════════════════════════════════

export interface SignInData {
  email: string;
  password: string;
}

export interface DeliverySignInData {
  username: string;
  password: string;
}

export interface SignUpData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface ValidationErrors {
  [key: string]: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Password Strength ───────────────────────────────
export type PasswordStrength = 'weak' | 'fair' | 'strong' | 'excellent';

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (password.length < 6) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const mixedCase = hasUpper && hasLower;

  if (password.length >= 8 && mixedCase && hasNumber && hasSpecial) return 'excellent';
  if (password.length >= 8 && mixedCase) return 'strong';
  if (password.length >= 6) return 'fair';
  return 'weak';
};

export const strengthConfig: Record<
  PasswordStrength,
  { color: string; label: string; width: string }
> = {
  weak: { color: '#E74C3C', label: 'Weak', width: '25%' },
  fair: { color: '#F39C12', label: 'Fair', width: '50%' },
  strong: { color: '#2E75B6', label: 'Strong', width: '75%' },
  excellent: { color: '#27AE60', label: 'Excellent', width: '100%' },
};

// ─── Delivery Sign In Validation ─────────────────────
export const validateDeliverySignIn = (data: DeliverySignInData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.username.trim()) {
    errors.username = 'Username is required';
  } else if (!/^[A-Za-z0-9]+\.[A-Za-z0-9.]+$/.test(data.username.trim())) {
    errors.username = 'Enter your full username (e.g., FM2024.saim)';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  }

  return errors;
};

// ─── Sign In Validation ──────────────────────────────
export const validateSignIn = (data: SignInData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return errors;
};

// ─── Sign Up Validation ──────────────────────────────
export const validateSignUp = (data: SignUpData): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Full Name
  if (!data.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (data.fullName.trim().length < 2) {
    errors.fullName = 'Name must be at least 2 characters';
  }

  // Email
  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  // Phone
  if (data.phone && !/^\+?[\d\s-]{7,15}$/.test(data.phone.replace(/\s/g, ''))) {
    errors.phone = 'Please enter a valid phone number';
  }

  // Password
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  // Confirm Password
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Terms
  if (!data.acceptedTerms) {
    errors.acceptedTerms = 'You must accept the Terms and Conditions';
  }

  return errors;
};

// ─── Forgot Password Validation ──────────────────────
export const validateForgotPassword = (email: string): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  return errors;
};
