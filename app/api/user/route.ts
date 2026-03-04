import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isViewTutorial: true, isViewTutorialMobile: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (typeof body.isMobile !== "boolean") {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }
  const field = body.isMobile ? "isViewTutorialMobile" : "isViewTutorial";
  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: { [field]: true },
    select: { isViewTutorial: true, isViewTutorialMobile: true },
  });
  return NextResponse.json(user);
}