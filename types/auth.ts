import { UserRole, TenantInfo } from "./cmdb";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title?: string;
  tenantId: string;
  tenantName: string;
  tenantDomain: string;
  availableTenants: TenantInfo[];
  groups?: string[];
  services?: string[];
  isServiceAccount?: boolean;
  connectorId?: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  otpCode?: string | null;
  otpExpiresAt?: string | null;
  resetToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  title?: string;
  tenantId: string;
  tenantName: string;
  tenantDomain: string;
  availableTenants: TenantInfo[];
  groups?: string[];
  services?: string[];
  isServiceAccount?: boolean;
  connectorId?: string;
  onboardingCompleted: boolean;
  expiresAt: number; // Unix timestamp ms
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterStep1Data {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface RegisterStep2Data {
  companyName: string;
  companySize: "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";
  role: "IT Manager" | "DevOps/SRE" | "CTO/Founder" | "Service Desk Lead" | "Other";
  primaryGoals: string[];
}

export type RegisterData = RegisterStep1Data & RegisterStep2Data;

export interface VerifyOtpData {
  email: string;
  otp: string;
  flow: "register" | "reset";
}

export interface ResetPasswordData {
  email: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AcceptInviteData {
  token: string;
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  unverified?: boolean;
  lockedUntil?: string | null;
  lockRemainingMinutes?: number;
  user?: User;
  session?: AuthSession;
  redirectUrl?: string;
}
