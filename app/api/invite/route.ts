import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";

// Utilidad para sumar días a una fecha
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dashboardId, role, email, expiryDays, maxUses } = body;
    if (!dashboardId || !role) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }
    // Generar token único
    const token = randomBytes(16).toString("hex");
    // Calcular fecha de expiración si corresponde
    let expiresAt: Date | null = null;
    if (expiryDays && typeof expiryDays === "number") {
      expiresAt = addDays(new Date(), expiryDays);
    }
    // Crear invitación
    const invite = await prisma.dashboardInvite.create({
      data: {
        dashboardId,
        token,
        role,
        email,
        expiresAt,
        maxUses: maxUses === null ? null : Number(maxUses),
      },
    });
    return NextResponse.json({ token: invite.token });
  } catch (e) {
    return NextResponse.json({ error: "Error al crear invitación" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dashboardId = searchParams.get("dashboardId");
  if (!dashboardId) {
    return NextResponse.json({ invites: [] });
  }
  const invites = await prisma.dashboardInvite.findMany({
    where: { dashboardId },
    orderBy: { createdAt: "desc" },
    include: {
      acceptedBy: { select: { name: true, email: true } },
    },
  });
  return NextResponse.json({ invites });
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    await prisma.dashboardInvite.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar invitación" }, { status: 500 });
  }
}
