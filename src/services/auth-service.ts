/**
 * ZenOps Authentication Service (services/auth-service.ts)
 *
 * The ONLY place auth logic and session persistence is handled for the ZenOps platform.
 * Backed by browser persistence and cookie management for Next.js middleware compatibility.
 */

import {
  User,
  AuthSession,
  LoginCredentials,
  RegisterData,
  VerifyOtpData,
  ResetPasswordData,
  AcceptInviteData,
  AuthResponse,
} from "@/types/auth";
import { AVAILABLE_TENANTS } from "@/lib/constants";
import { TenantInfo, UserRole } from "@/types/cmdb";

const STORAGE_USERS_KEY = "zenops_auth_users";
const STORAGE_SESSION_KEY = "zenops_auth_session";
export const SESSION_COOKIE_NAME = "zenops_session";

// -----------------------------------------------------------------------------
// SEEDED DEMO ACCOUNTS (Aligned with RBAC Roles & Directory Groups)
// -----------------------------------------------------------------------------
const SEEDED_USERS: User[] = [
  {
    id: "USR-1001",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@gmail.com",
    role: "CMDB Administrator",
    title: "Principal Platform Engineer",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["CMDB-Admins", "Platform-Eng"],
    services: ["Core Infrastructure"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1002",
    name: "David Chen",
    email: "david.chen@gmail.com",
    role: "CMDB Manager",
    title: "Enterprise Architecture Lead",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: [AVAILABLE_TENANTS[0]],
    groups: ["CMDB-Managers", "Governance"],
    services: ["Payment Processing", "Customer Portal"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-02-10T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1003",
    name: "Priya Sharma",
    email: "priya.sharma@gmail.com",
    role: "Data Steward",
    title: "Database Reliability Engineer",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: [AVAILABLE_TENANTS[0]],
    groups: ["CMDB-Stewards", "DBA-Team"],
    services: ["Core Banking"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1004",
    name: "Alex Rivera",
    email: "alex.rivera@gmail.com",
    role: "Auditor",
    title: "Compliance & Security Auditor",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: [AVAILABLE_TENANTS[0]],
    groups: ["Audit-Readers", "Compliance"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-04-12T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1005",
    name: "Marcus Vance",
    email: "discovery.admin@gmail.com",
    role: "Discovery / Integration Admin",
    title: "Automated Telemetry Engineer",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["Discovery-Admins"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-04-15T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1006",
    name: "Elena Rostova",
    email: "ci.owner@gmail.com",
    role: "CI Owner",
    title: "Senior Database Administrator",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["Database-Admins", "DevOps"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1007",
    name: "Liam Tanaka",
    email: "service.owner@gmail.com",
    role: "Service Owner",
    title: "Payment Systems Tech Lead",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["Payment-Platform-Lead"],
    services: ["Payment Processing", "Identity Gateway"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-05-10T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1008",
    name: "Jordan Bell",
    email: "service.desk@gmail.com",
    role: "Service Desk Agent",
    title: "Incident Triage Specialist",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["Service-Desk"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-05-15T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1009",
    name: "Rachel Torres",
    email: "change.manager@gmail.com",
    role: "Change Manager",
    title: "Change Advisory Board Chair",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["Change-Managers"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-05-20T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1010",
    name: "Kenji Sato",
    email: "problem.analyst@gmail.com",
    role: "Incident / Problem Analyst",
    title: "Senior Reliability Investigator",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["Problem-Analysts"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1011",
    name: "Victoria Sterling",
    email: "executive@gmail.com",
    role: "Executive / Report Viewer",
    title: "Chief Information Officer",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["IT-Leadership"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-06-10T09:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1012",
    name: "Break-Glass Administrator",
    email: "breakglass@gmail.com",
    role: "Break-glass Administrator",
    title: "Emergency Incident Responder",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["Emergency-Admins"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
  },
  {
    id: "USR-1013",
    name: "Alex Chen",
    email: "alex.chen@gmail.com",
    role: "CMDB Administrator",
    title: "Principal Cloud Architect",
    tenantId: "CMP_1001_ZENDEV",
    tenantName: "ZenDev Software Technologies",
    tenantDomain: "zendev.zenops.io",
    availableTenants: AVAILABLE_TENANTS,
    groups: ["CMDB-Admins"],
    emailVerified: true,
    onboardingCompleted: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-11-16T08:00:00Z",
  },
];

// In-memory passwords for demo accounts
const PASSWORDS: Record<string, string> = {
  "sarah.jenkins@gmail.com": "Password@123",
  "david.chen@gmail.com": "Password@123",
  "priya.sharma@gmail.com": "Password@123",
  "alex.rivera@gmail.com": "Password@123",
  "discovery.admin@gmail.com": "Password@123",
  "ci.owner@gmail.com": "Password@123",
  "service.owner@gmail.com": "Password@123",
  "service.desk@gmail.com": "Password@123",
  "change.manager@gmail.com": "Password@123",
  "problem.analyst@gmail.com": "Password@123",
  "executive@gmail.com": "Password@123",
  "breakglass@gmail.com": "Password@123",
  "admin@gmail.com": "Password@123",
  "alex.chen@gmail.com": "Password@123",
  // Legacy aliases
  "sarah.jenkins@zenops.io": "Password@123",
  "david.chen@zenops.io": "Password@123",
  "priya.sharma@zenops.io": "Password@123",
  "alex.rivera@zenops.io": "Password@123",
  "founder@startup.io": "Password@123",
};

export class AuthService {
  // ---------------------------------------------------------------------------
  // STORAGE HELPERS
  // ---------------------------------------------------------------------------
  private static getUsers(): User[] {
    if (typeof window === "undefined") return SEEDED_USERS;
    try {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User[];
        // Merge missing seeded users
        SEEDED_USERS.forEach((su) => {
          if (!parsed.some((u) => u.email.toLowerCase() === su.email.toLowerCase())) {
            parsed.push(su);
          }
        });
        return parsed;
      }
    } catch {
      // ignore
    }
    this.saveUsers(SEEDED_USERS);
    return SEEDED_USERS;
  }

  private static saveUsers(users: User[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch {
      // ignore
    }
  }

  private static getStoredPassword(email: string): string | null {
    if (typeof window === "undefined") return PASSWORDS[email.toLowerCase()] || null;
    try {
      const stored = localStorage.getItem(`zenops_pass_${email.toLowerCase()}`);
      if (stored) return stored;
    } catch {
      // ignore
    }
    return PASSWORDS[email.toLowerCase()] || null;
  }

  private static saveStoredPassword(email: string, password: string): void {
    PASSWORDS[email.toLowerCase()] = password;
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`zenops_pass_${email.toLowerCase()}`, password);
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // SESSION & COOKIE MANAGEMENT
  // ---------------------------------------------------------------------------
  public static getSession(): AuthSession | null {
    if (typeof window === "undefined") return null;

    // First check localStorage
    try {
      const stored = localStorage.getItem(STORAGE_SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored) as AuthSession;
        if (session.expiresAt > Date.now()) {
          return session;
        } else {
          this.logout();
          return null;
        }
      }
    } catch {
      // ignore
    }

    // Check cookie fallback
    try {
      let cookieVal = this.getCookie(SESSION_COOKIE_NAME);
      if (cookieVal) {
        cookieVal = decodeURIComponent(cookieVal).replace(/^"(.*)"$/, "$1");
        const decoded = JSON.parse(decodeURIComponent(escape(atob(cookieVal)))) as AuthSession;
        if (decoded && decoded.expiresAt > Date.now()) {
          try {
            localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(decoded));
          } catch {}
          return decoded;
        }
      }
    } catch {
      // ignore
    }

    // Default fallback demo session for seamless pure frontend browsing
    const defaultSession: AuthSession = {
      userId: SEEDED_USERS[0].id,
      email: SEEDED_USERS[0].email,
      name: SEEDED_USERS[0].name,
      role: "Admin",
      title: SEEDED_USERS[0].title,
      tenantId: SEEDED_USERS[0].tenantId,
      tenantName: SEEDED_USERS[0].tenantName,
      tenantDomain: SEEDED_USERS[0].tenantDomain,
      availableTenants: AVAILABLE_TENANTS,
      onboardingCompleted: true,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    return defaultSession;
  }

  public static setSession(session: AuthSession, rememberMe = true): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));

      // Encode session into base64 for cookie accessible by middleware
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(session))));
      const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days or 1 day
      document.cookie = `${SESSION_COOKIE_NAME}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch {
      // ignore
    }
  }

  public static clearSession(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
      // ignore
    }
  }

  private static getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATION OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Register a new user and workspace (Step 1 + Step 2)
   */
  public static async register(data: RegisterData): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 400));
    const users = this.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());

    if (existing) {
      if (!existing.emailVerified) {
        return {
          success: false,
          error: "An account with this email already exists but is unverified.",
          unverified: true,
        };
      }
      return {
        success: false,
        error: "An account with this email address is already registered. Please sign in instead.",
      };
    }

    const companyClean = data.companyName.trim();
    const shortName = companyClean.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "Tenant";
    const tenantId = `CMP_${Math.floor(1000 + Math.random() * 9000)}_${shortName.toUpperCase()}`;
    const tenantDomain = `${shortName.toLowerCase()}.zenops.io`;

    const newTenant: TenantInfo = {
      id: tenantId,
      name: companyClean,
      domain: tenantDomain,
      shortName,
    };

    const otpCode = "123456"; // Standard demo OTP code
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const newUser: User = {
      id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: "Admin", // First registered user of a workspace is workspace Admin
      title: data.role || "Workspace Admin",
      tenantId: newTenant.id,
      tenantName: newTenant.name,
      tenantDomain: newTenant.domain,
      availableTenants: [newTenant],
      emailVerified: false,
      onboardingCompleted: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      otpCode,
      otpExpiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    this.saveStoredPassword(newUser.email, data.password);

    return {
      success: true,
      message: "Registration initiated. Verification OTP sent to your email address.",
      user: newUser,
    };
  }

  /**
   * Verify email or password reset 6-digit OTP
   */
  public static async verifyOtp(data: VerifyOtpData): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 200));
    const users = this.getUsers();
    let user = users.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase()) || SEEDED_USERS[0];

    user.emailVerified = true;
    user.onboardingCompleted = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.updatedAt = new Date().toISOString();
    this.saveUsers(users);

    if (data.flow === "register") {
      return {
        success: true,
        message: "Email verified successfully.",
        user,
      };
    } else {
      const resetToken = `RST_${Math.random().toString(36).substring(2)}${Date.now()}`;
      user.resetToken = resetToken;
      this.saveUsers(users);

      return {
        success: true,
        message: "OTP confirmed. You may now reset your password.",
        user,
        redirectUrl: `/reset-password?email=${encodeURIComponent(user.email)}&token=${resetToken}`,
      };
    }
  }

  /**
   * Resend verification or password reset OTP
   */
  public static async resendOtp(email: string, flow: "register" | "reset" = "register"): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 300));
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return {
        success: false,
        error: "Account not found for this email address.",
      };
    }

    user.otpCode = "123456";
    user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    this.saveUsers(users);

    return {
      success: true,
      message: `A new 6-digit verification code was dispatched to ${email}.`,
    };
  }

  /**
   * Log into the platform – accepts ANY credentials for pure frontend design demo
   */
  public static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 200));
    const users = this.getUsers();
    const rawEmail = (credentials.email || "").trim();
    let emailClean = (rawEmail || "admin@gmail.com").toLowerCase();
    if (!emailClean.includes("@")) {
      emailClean = `${emailClean}@gmail.com`;
    }

    // Look for existing user or create a dynamic one on the fly
    let user = users.find((u) => u.email.toLowerCase() === emailClean);

    if (!user) {
      const namePart = rawEmail.includes("@") ? rawEmail.split("@")[0] : rawEmail;
      const displayName =
        namePart.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Demo Admin";

      user = {
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: displayName,
        email: emailClean,
        role: "Admin",
        title: "Enterprise Platform Lead",
        tenantId: "CMP_1001_ZENDEV",
        tenantName: "ZenDev Software Technologies",
        tenantDomain: "zendev.zenops.io",
        availableTenants: AVAILABLE_TENANTS,
        emailVerified: true,
        onboardingCompleted: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.push(user);
    } else {
      user.emailVerified = true;
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.onboardingCompleted = true;
    }

    this.saveUsers(users);

    const sessionDuration = credentials.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      tenantDomain: user.tenantDomain,
      groups: user.groups || ["Platform-Eng"],
      services: user.services || [],
      availableTenants:
        user.availableTenants && user.availableTenants.length > 0
          ? user.availableTenants
          : AVAILABLE_TENANTS,
      onboardingCompleted: true,
      expiresAt: Date.now() + sessionDuration,
    };

    this.setSession(session, Boolean(credentials.rememberMe));

    return {
      success: true,
      message: "Signed in successfully.",
      user,
      session,
    };
  }

  /**
   * 1-Click Social Sign-In for Google & Microsoft (Demo & Instant access)
   */
  public static async socialLogin(provider: "google" | "microsoft"): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 200));
    const users = this.getUsers();
    const isGoogle = provider === "google";
    const emailClean = isGoogle ? "alex.chen@gmail.com" : "alex.chen.work@gmail.com";
    const displayName = isGoogle ? "Alex Chen (Google)" : "Alex Chen (Microsoft)";
    const title = isGoogle ? "Google Workspace Lead" : "Cloud Platform Architect";

    let user = users.find((u) => u.email.toLowerCase() === emailClean);
    if (!user) {
      user = {
        id: `USR-${isGoogle ? "GGL" : "MS"}-${Math.floor(1000 + Math.random() * 9000)}`,
        name: displayName,
        email: emailClean,
        role: "Admin",
        title: title,
        tenantId: "CMP_1001_ZENDEV",
        tenantName: "ZenDev Software Technologies",
        tenantDomain: "zendev.zenops.io",
        availableTenants: AVAILABLE_TENANTS,
        emailVerified: true,
        onboardingCompleted: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.push(user);
    } else {
      user.emailVerified = true;
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.onboardingCompleted = true;
    }

    this.saveUsers(users);

    const sessionDuration = 30 * 24 * 60 * 60 * 1000;
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      tenantDomain: user.tenantDomain,
      groups: user.groups || ["Platform-Eng"],
      services: user.services || [],
      availableTenants:
        user.availableTenants && user.availableTenants.length > 0
          ? user.availableTenants
          : AVAILABLE_TENANTS,
      onboardingCompleted: true,
      expiresAt: Date.now() + sessionDuration,
    };

    this.setSession(session, true);

    return {
      success: true,
      message: `Signed in successfully with ${isGoogle ? "Google" : "Microsoft"}.`,
      user,
      session,
    };
  }

  /**
   * Terminate active session and clear cookies
   */
  public static async logout(): Promise<void> {
    this.clearSession();
  }

  /**
   * Request password reset code
   */
  public static async requestPasswordReset(email: string): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 400));
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    // Security best practice: Always return friendly confirmation so attackers cannot enumerate valid emails
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email address, a password reset code has been sent.",
      };
    }

    user.otpCode = "123456";
    user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    this.saveUsers(users);

    return {
      success: true,
      message: "A password reset code has been sent to your email address.",
    };
  }

  /**
   * Confirm reset token and set new password
   */
  public static async resetPassword(data: ResetPasswordData): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 400));
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());

    if (!user) {
      return {
        success: false,
        error: "Account not found.",
      };
    }

    if (user.resetToken && user.resetToken !== data.resetToken) {
      return {
        success: false,
        error: "Invalid or expired password reset token.",
      };
    }

    this.saveStoredPassword(user.email, data.newPassword);
    user.resetToken = null;
    user.otpCode = null;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.updatedAt = new Date().toISOString();
    this.saveUsers(users);

    return {
      success: true,
      message: "Password updated successfully. Please sign in with your new credentials.",
    };
  }

  /**
   * Accept an invitation to join an existing workspace
   */
  public static async acceptInvite(data: AcceptInviteData): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 450));
    const users = this.getUsers();

    const existing = users.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (existing) {
      this.saveStoredPassword(existing.email, data.password);
      existing.emailVerified = true;
      this.saveUsers(users);
      return {
        success: true,
        message: "Invitation accepted. Please sign in.",
      };
    }

    const newUser: User = {
      id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: "Editor",
      tenantId: "CMP_1001_ZENDEV",
      tenantName: "ZenDev Software Technologies",
      tenantDomain: "zendev.zenops.io",
      availableTenants: AVAILABLE_TENANTS,
      emailVerified: true,
      onboardingCompleted: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    this.saveStoredPassword(newUser.email, data.password);

    return {
      success: true,
      message: "Invitation accepted. You can now log into your workspace.",
    };
  }

  /**
   * Mark onboarding completed for active session
   */
  public static markOnboardingCompleted(userId: string): void {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.onboardingCompleted = true;
      this.saveUsers(users);
    }
    const session = this.getSession();
    if (session && session.userId === userId) {
      session.onboardingCompleted = true;
      this.setSession(session);
    }
  }

  /**
   * Get all registered & seeded users
   */
  public static getAllUsers(): User[] {
    return this.getUsers();
  }

  /**
   * Update a user's profile information and sync session if active
   */
  public static updateUserProfile(userId: string, updates: Partial<User>): User | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    users[idx] = {
      ...users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveUsers(users);

    const session = this.getSession();
    if (session && session.userId === userId) {
      const updatedSession: AuthSession = {
        ...session,
        name: updates.name ?? session.name,
        title: updates.title ?? session.title,
        role: updates.role ?? session.role,
        tenantName: updates.tenantName ?? session.tenantName,
      };
      this.setSession(updatedSession);
    }

    return users[idx];
  }

  /**
   * Switch the active session to one of the seeded demo accounts by email
   */
  public static switchToDemoUser(email: string): AuthSession | null {
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;

    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      tenantDomain: user.tenantDomain,
      availableTenants: user.availableTenants || AVAILABLE_TENANTS,
      groups: user.groups,
      services: user.services,
      onboardingCompleted: true,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    this.setSession(session);
    return session;
  }

  /**
   * Get list of demo accounts for dev mode quick-fill (Aligned with All 12 Human RBAC Roles)
   */
  public static getDemoAccounts() {
    return [
      {
        name: "Sarah Jenkins",
        email: "sarah.jenkins@gmail.com",
        role: "CMDB Administrator",
        password: "Password@123",
        note: "Default Admin: Full technical control. Barred from task.approve due to SoD.",
      },
      {
        name: "David Chen",
        email: "david.chen@gmail.com",
        role: "CMDB Manager",
        password: "Password@123",
        note: "Governance authority: Approves merges, rules & quality tasks.",
      },
      {
        name: "Priya Sharma",
        email: "priya.sharma@gmail.com",
        role: "Data Steward",
        password: "Password@123",
        note: "Data remediation lead: Can apply auto-fixes and edit operational CIs.",
      },
      {
        name: "Marcus Vance",
        email: "discovery.admin@gmail.com",
        role: "Discovery / Integration Admin",
        password: "Password@123",
        note: "Automated telemetry orchestrator: Configures sources and connectors.",
      },
      {
        name: "Elena Rostova",
        email: "ci.owner@gmail.com",
        role: "CI Owner",
        password: "Password@123",
        note: "Database SME: Edits and attests owned CIs (Database-Admins group).",
      },
      {
        name: "Liam Tanaka",
        email: "service.owner@gmail.com",
        role: "Service Owner",
        password: "Password@123",
        note: "Service Lead: Owns Payment Processing service & downstream nodes.",
      },
      {
        name: "Jordan Bell",
        email: "service.desk@gmail.com",
        role: "Service Desk Agent",
        password: "Password@123",
        note: "Tier 1 Support: Read-only CI lookup during incident triage.",
      },
      {
        name: "Rachel Torres",
        email: "change.manager@gmail.com",
        role: "Change Manager",
        password: "Password@123",
        note: "CAB Coordinator: Views dependency topology risk & change audits.",
      },
      {
        name: "Kenji Sato",
        email: "problem.analyst@gmail.com",
        role: "Incident / Problem Analyst",
        password: "Password@123",
        note: "Root cause investigator: Views CIs and appends diagnostic worklogs.",
      },
      {
        name: "Alex Rivera",
        email: "alex.rivera@gmail.com",
        role: "Auditor",
        password: "Password@123",
        note: "Independent auditor: Read-only access to CIs, logs & dashboards.",
      },
      {
        name: "Victoria Sterling",
        email: "executive@gmail.com",
        role: "Executive / Report Viewer",
        password: "Password@123",
        note: "CIO Overview: Dashboard KPIs and Trust Score only. No CI drill-down.",
      },
      {
        name: "Break-Glass Administrator",
        email: "breakglass@gmail.com",
        role: "Break-glass Administrator",
        password: "Password@123",
        note: "Emergency responder: Full access with automated SOC security alerts.",
      },
    ];
  }
}
