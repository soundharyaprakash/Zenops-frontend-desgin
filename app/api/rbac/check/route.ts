import { NextRequest, NextResponse } from "next/server";
import { can, PermissionKey } from "@/lib/rbac";
import { AuthService } from "@/services/auth-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { permission, resource, userContext } = body;

    // Decode session cookie if userContext not provided
    let user = userContext;
    if (!user) {
      let sessionCookie = request.cookies.get("zenops_session")?.value;
      if (sessionCookie) {
        sessionCookie = decodeURIComponent(sessionCookie).replace(/^"(.*)"$/, "$1");
        const decoded = JSON.parse(decodeURIComponent(escape(atob(sessionCookie))));
        user = {
          id: decoded.user?.id || decoded.userId || "USR-MOCK",
          name: decoded.user?.name || decoded.name || "Demo User",
          email: decoded.user?.email || decoded.email || "demo@zenops.local",
          role: decoded.user?.role || decoded.role || "Admin",
          tenantId: decoded.user?.tenantId || decoded.tenantId || "CMP_1001_ZENDEV",
          groups: decoded.user?.groups || decoded.groups || [],
          services: decoded.user?.services || decoded.services || [],
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { allowed: false, reason: "Authentication required" },
        { status: 401 }
      );
    }

    const decision = can(user, permission as PermissionKey, resource);

    if (decision.notFound) {
      return NextResponse.json(
        { error: "Configuration Item Not Found in active tenant" },
        { status: 404 }
      );
    }

    return NextResponse.json(decision);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
