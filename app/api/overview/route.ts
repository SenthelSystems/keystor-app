import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const [propertiesCount, units, requests, recentAudit] = await Promise.all([
      prisma.property.count({ where: { organizationId: orgId } }),
      prisma.unit.findMany({
        where: { organizationId: orgId },
        select: { status: true, baseRentCents: true },
      }),
      prisma.maintenanceRequest.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          status: true,
          priority: true,
          createdAt: true,
          title: true,
          tenantId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
      }),
    ]);

    const unitsTotal = units.length;
    const vacant = units.filter((u) => u.status === "VACANT").length;
    const occupied = units.filter((u) => u.status === "OCCUPIED").length;

    const baseRentMonthlyCents = units.reduce((sum, u) => sum + (u.baseRentCents || 0), 0);

    const openReq = requests.filter((r) => r.status === "OPEN");
    const highReq = requests.filter(
      (r) => r.status !== "COMPLETE" && r.priority?.toUpperCase() === "HIGH"
    );

    const now = Date.now();
    const days7 = 7 * 24 * 60 * 60 * 1000;

    const agingReq = requests.filter((r) => {
      if (r.status === "COMPLETE" || r.status === "CANCELLED") return false;
      const age = now - new Date(r.createdAt).getTime();
      return age > days7;
    });

    // Repeat-tenant awareness (3+ OPEN requests)
    const tenantRequestCount = new Map<string, number>();
    openReq.forEach((r) => {
      if (!r.tenantId) return;
      tenantRequestCount.set(r.tenantId, (tenantRequestCount.get(r.tenantId) ?? 0) + 1);
    });
    const repeatTenantFlag = Array.from(tenantRequestCount.values()).some((c) => c >= 3);

    // ---- Smart selection logic for Attention top list ----
    // Goal: keep high/aging prioritized BUT always include newest OPEN items.
    // We'll build a scored list and then ensure newest OPEN items are represented.

    const isHigh = (r: any) => r.priority?.toUpperCase() === "HIGH" && r.status !== "COMPLETE";
    const isAging = (r: any) =>
      r.status !== "COMPLETE" &&
      r.status !== "CANCELLED" &&
      now - new Date(r.createdAt).getTime() > days7;

    const uniqueById = (arr: any[]) => {
      const seen = new Set<string>();
      return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
    };

    // base ranked list
    const ranked = uniqueById([...requests]).sort((a, b) => {
      const aScore = (isHigh(a) ? 2 : 0) + (isAging(a) ? 1 : 0);
      const bScore = (isHigh(b) ? 2 : 0) + (isAging(b) ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      // tiebreaker: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // take initial top 6
    let top = ranked.slice(0, 6);

    // ensure newest OPEN item is included (if it exists)
    const newestOpen = openReq[0]; // requests are already ordered desc by createdAt
    if (newestOpen && !top.some((t) => t.id === newestOpen.id)) {
      // replace the last item with newest OPEN
      top = [...top.slice(0, 5), newestOpen];
      top = uniqueById(top);
    }

    return NextResponse.json({
      snapshot: {
        propertiesCount,
        unitsTotal,
        vacant,
        occupied,
        baseRentMonthlyCents,
      },
      attention: {
        openCount: openReq.length,
        highPriorityCount: highReq.length,
        agingCount: agingReq.length,
        repeatTenantFlag,
        top: top.map((r) => ({
          id: r.id,
          title: r.title,
          priority: r.priority,
          status: r.status,
          createdAt: r.createdAt,
        })),
      },
      activity: recentAudit,
    });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: e?.message ?? "Failed to load overview" }, { status });
  }
}
