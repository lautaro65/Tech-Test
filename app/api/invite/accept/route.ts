// app/api/invite/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { token, dashboardId } = await req.json();
  if (!token || !dashboardId) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Buscar la invitación a aceptar
  const invite = await prisma.dashboardInvite.findFirst({
    where: { token, dashboardId },
    select: {
      id: true,
      role: true,
      expiresAt: true,
      maxUses: true,
      useCount: true,
      dashboard: { select: { id: true, name: true, ownerId: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  // No puede aceptar su propio dashboard
  if (invite.dashboard.ownerId === user.id) {
    return NextResponse.json({ error: "Sos el dueño de este dashboard" }, { status: 409 });
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json({ error: "La invitación ha vencido" }, { status: 410 });
  }

  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    return NextResponse.json({ error: "Esta invitación alcanzó el límite de usos" }, { status: 410 });
  }

  // Verificar si ya tiene membresía en este dashboard
  const existingMembership = await prisma.dashboardInvite.findFirst({
    where: { dashboardId, acceptedById: user.id },
    select: { id: true, role: true },
  });

  await prisma.$transaction(async (tx) => {
    if (existingMembership) {
      // Reemplazar: limpiar la membresía anterior
      await tx.dashboardInvite.update({
        where: { id: existingMembership.id },
        data: {
          acceptedById: null,
          acceptedAt: null,
        },
      });
    }

    // Aceptar la nueva invitación
    await tx.dashboardInvite.update({
      where: { id: invite.id },
      data: {
        acceptedById: user.id,
        acceptedAt: new Date(),
        useCount: { increment: 1 },
      },
    });
  });

  return NextResponse.json({
    dashboardId: invite.dashboard.id,
    dashboardName: invite.dashboard.name,
    role: invite.role,
    roleChanged: existingMembership ? existingMembership.role !== invite.role : false,
  });
}