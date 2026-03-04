import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing dashboard id" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const dashboard = await prisma.dashboard.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      canvasData: true,
      presetId: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
    },
  });

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  // Dueño → acceso total, rol OWNER
  if (dashboard.ownerId === user.id) {
    const { ownerId, ...rest } = dashboard;
    return NextResponse.json({ ...rest, role: "OWNER", isOwner: true });
  }

  // No es dueño → buscar invitación aceptada y vigente
  const invite = await prisma.dashboardInvite.findFirst({
    where: {
      dashboardId: id,
      acceptedById: user.id,
    },
    select: {
      role: true,
      expiresAt: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verificar que no esté vencida
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: "Tu invitación a este dashboard ha vencido" },
      { status: 403 }
    );
  }

  const { ownerId, ...rest } = dashboard;
  // invite.role es "VIEWER" o "EDITOR"
  return NextResponse.json({ ...rest, role: invite.role, isOwner: false });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const dashboard = await prisma.dashboard.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  const isOwner = dashboard.ownerId === user.id;

  if (!isOwner) {
    // Solo EDITOR puede guardar, no VIEWER
    const invite = await prisma.dashboardInvite.findFirst({
      where: {
        dashboardId: id,
        acceptedById: user.id,
        role: "EDITOR",
      },
      select: { expiresAt: true },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "No tenés permiso para editar este dashboard" },
        { status: 403 }
      );
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Tu acceso de edición ha vencido" },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  if (!Array.isArray(body.canvasData)) {
    return NextResponse.json({ error: "canvasData inválido" }, { status: 400 });
  }

  const updated = await prisma.dashboard.update({
    where: { id },
    data: { canvasData: body.canvasData },
    select: { id: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}