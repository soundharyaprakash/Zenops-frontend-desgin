import { NextRequest, NextResponse } from "next/server";
import { can, PERMISSIONS } from "@/lib/rbac";
import { INITIAL_CIS } from "@/services/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ciId = params.id;
  const ci = INITIAL_CIS.find((item) => item.id === ciId);

  // Extract user from session cookie
  let user: any = null;
  let sessionCookie = request.cookies.get("zenops_session")?.value;
  if (sessionCookie) {
    try {
      sessionCookie = decodeURIComponent(sessionCookie).replace(/^"(.*)"$/, "$1");
      const decoded = JSON.parse(decodeURIComponent(escape(atob(sessionCookie))));
      user = {
        id: decoded.user?.id || decoded.userId || "USR-MOCK",
        name: decoded.user?.name || decoded.name || "Demo User",
        email: decoded.user?.email || decoded.email || "demo@zenops.local",
        role: decoded.user?.role || decoded.role || "Admin",
        tenantId: decoded.user?.tenantId || decoded.tenantId || "CMP_1001_ZENDEV",
        tenantName: decoded.user?.tenantName || decoded.tenantName || "ZenDev Software Technologies",
        groups: decoded.user?.groups || decoded.groups || [],
        services: decoded.user?.services || decoded.services || [],
      };
    } catch {
      // ignore
    }
  }

  if (!ci) {
    return NextResponse.json({ error: "Configuration Item Not Found" }, { status: 404 });
  }

  const decision = can(user, PERMISSIONS.CI_VIEW, {
    id: ci.id,
    name: ci.name,
    tenantName: ci.company || (ci as any).tenant,
    environment: ci.environment,
    ciClass: ci.ciClass,
    ownerGroup: ci.supportGroup || (ci as any).ownerGroup,
    owner: ci.owner,
  });

  if (decision.notFound) {
    return NextResponse.json(
      { error: "Configuration Item Not Found in active tenant" },
      { status: 404 }
    );
  }

  if (!decision.allowed) {
    return NextResponse.json(
      { error: "Access Denied: " + decision.reason },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, ci });
}
