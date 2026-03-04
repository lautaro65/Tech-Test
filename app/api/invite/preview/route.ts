// app/api/invite/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const dashboardId = searchParams.get("dashboardId");

  if (!token || !dashboardId) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? null;

  const currentUser = userEmail
    ? await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      })
    : null;

  const invite = await prisma.dashboardInvite.findFirst({
    where: { token, dashboardId },
    select: {
      role: true,
      expiresAt: true,
      dashboard: {
        select: {
          name: true,
          owner: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json({ error: "La invitación ha vencido" }, { status: 410 });
  }

  // Verificar si ya es miembro de este dashboard
  let alreadyMember = false;
  let currentRole: string | null = null;

  if (currentUser) {
    const existing = await prisma.dashboardInvite.findFirst({
      where: { dashboardId, acceptedById: currentUser.id },
      select: { role: true },
    });
    if (existing) {
      alreadyMember = true;
      currentRole = existing.role;
    }
  }

  return NextResponse.json({
    dashboardName: invite.dashboard.name,
    ownerName: invite.dashboard.owner.name,
    ownerEmail: invite.dashboard.owner.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    alreadyMember,
    currentRole,
  });
}