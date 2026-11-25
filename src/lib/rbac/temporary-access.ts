/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - Temporary Access Management
 *
 * Implements Just-In-Time (JIT) privileged access elevations with time-based auto-expiration.
 */

export interface TemporaryAccessException {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  elevatedRole: string; // role key or name
  reason: string;
  ticketId?: string; // e.g. CHG-9402 or INC-10294
  startDate: string; // ISO string
  endDate: string; // ISO string
  approverName: string;
  approverEmail: string;
  status: "active" | "expired" | "revoked";
  createdAt: string;
}

const STORAGE_KEY_EXCEPTIONS = "zenops_rbac_temporary_exceptions";

export const INITIAL_EXCEPTIONS: TemporaryAccessException[] = [
  {
    id: "EXC-101",
    userId: "USR-1004",
    userName: "Alex Rivera",
    userEmail: "alex.rivera@gmail.com",
    elevatedRole: "Data Steward",
    reason: "Remediating untagged Oracle RDS clusters during Q4 maintenance window",
    ticketId: "CHG-8821",
    startDate: "2026-11-17T00:00:00Z",
    endDate: "2026-11-20T23:59:59Z", // active now
    approverName: "Sarah Jenkins",
    approverEmail: "sarah.jenkins@gmail.com",
    status: "active",
    createdAt: "2026-11-17T08:30:00Z",
  },
  {
    id: "EXC-100",
    userId: "USR-1003",
    userName: "Priya Sharma",
    userEmail: "priya.sharma@gmail.com",
    elevatedRole: "CMDB Manager",
    reason: "Authorized emergency retirement of legacy billing gateway",
    ticketId: "INC-4412",
    startDate: "2026-11-01T00:00:00Z",
    endDate: "2026-11-02T23:59:59Z", // expired in the past
    approverName: "David Chen",
    approverEmail: "david.chen@gmail.com",
    status: "expired",
    createdAt: "2026-11-01T06:00:00Z",
  },
];

let _inMemoryExceptions: TemporaryAccessException[] = [...INITIAL_EXCEPTIONS];

export class TemporaryAccessService {
  public static getExceptions(): TemporaryAccessException[] {
    const now = Date.now();
    if (typeof window === "undefined") {
      let changed = false;
      _inMemoryExceptions.forEach((exc) => {
        if (exc.status === "active" && new Date(exc.endDate).getTime() <= now) {
          exc.status = "expired";
          changed = true;
        }
      });
      return _inMemoryExceptions;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EXCEPTIONS);
      if (stored) {
        const parsed = JSON.parse(stored) as TemporaryAccessException[];
        // Auto-refresh expired status against current time
        let changed = false;
        parsed.forEach((exc) => {
          if (exc.status === "active" && new Date(exc.endDate).getTime() <= now) {
            exc.status = "expired";
            changed = true;
          }
        });
        if (changed) {
          this.saveExceptions(parsed);
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    this.saveExceptions(INITIAL_EXCEPTIONS);
    return INITIAL_EXCEPTIONS;
  }

  public static saveExceptions(exceptions: TemporaryAccessException[]): void {
    _inMemoryExceptions = exceptions;
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_EXCEPTIONS, JSON.stringify(exceptions));
    } catch {
      // ignore
    }
  }

  public static addException(newExc: Omit<TemporaryAccessException, "id" | "status" | "createdAt">): TemporaryAccessException {
    const list = this.getExceptions();
    const created: TemporaryAccessException = {
      ...newExc,
      id: `EXC-${Math.floor(100 + Math.random() * 900)}`,
      status: new Date(newExc.endDate).getTime() > Date.now() ? "active" : "expired",
      createdAt: new Date().toISOString(),
    };
    list.unshift(created);
    this.saveExceptions(list);
    return created;
  }

  public static revokeException(id: string): void {
    const list = this.getExceptions();
    const target = list.find((e) => e.id === id);
    if (target) {
      target.status = "revoked";
      this.saveExceptions(list);
    }
  }

  /**
   * Returns currently active (non-expired and non-revoked) exceptions for a specific user
   */
  public static getActiveExceptionsForUser(userId: string, userEmail?: string): TemporaryAccessException[] {
    const list = this.getExceptions();
    const now = Date.now();
    return list.filter((exc) => {
      const matchesUser =
        exc.userId === userId ||
        (userEmail && exc.userEmail.toLowerCase() === userEmail.toLowerCase());
      const isActive = exc.status === "active";
      const notExpired = new Date(exc.endDate).getTime() > now;
      return matchesUser && isActive && notExpired;
    });
  }
}
