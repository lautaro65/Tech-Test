import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import  prisma  from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  // Buscar el usuario por email para obtener el id
  const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!dbUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
  }
  const userId = dbUser.id;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
  }

  // Verificar que la invitación le pertenece al usuario que quiere salir
  const invite = await prisma.dashboardInvite.findFirst({
    where: { id, acceptedById: userId },
  });

  if (!invite) {
    return NextResponse.json(
      { error: "Invitación no encontrada o no tenés permiso" },
      { status: 404 }
    );
  }

  await prisma.$transaction([
    prisma.dashboardInvite.update({
      where: { id },
      data: {
        acceptedById: null,
        acceptedAt: null,
      },
    }),
    prisma.dashboardAuditLog.create({
      data: {
        dashboardId: invite.dashboardId,
        actorUserId: userId,
        action: "LEFT_DASHBOARD",
        meta: { inviteId: id, role: invite.role },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}