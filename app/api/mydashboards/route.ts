export async function DELETE(req: NextRequest) {
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
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing dashboard id" }, { status: 400 });
  }
  // Solo permite borrar dashboards del usuario autenticado
  const dashboard = await prisma.dashboard.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!dashboard || dashboard.ownerId !== user.id) {
    return NextResponse.json({ error: "Dashboard not found or forbidden" }, { status: 404 });
  }
  await prisma.dashboard.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
  const dashboards = await prisma.dashboard.findMany({
    where: { ownerId: user.id, isArchived: false },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
      createdAt: true,
      visibility: true,
      isArchived: true,
      lastOpenedAt: true,
      // Add more fields as needed
    },
  });
  // Dashboards compartidos conmigo (invitaciones aceptadas)
  const sharedInvites = await prisma.dashboardInvite.findMany({
    where: {
      acceptedById: user.id,
    },
    include: {
      dashboard: {
        select: {
          id: true,
          name: true,
          description: true,
          visibility: true,
          updatedAt: true,
          createdAt: true,
          owner: {
            select: { name: true, email: true },
          },
        },
      },
    },
    orderBy: { acceptedAt: "desc" },
  });

  // Filtrar por si acaso el dashboard fue eliminado (cascade lo maneja pero por seguridad)
  const sharedDashboards = sharedInvites
    .filter((i) => i.dashboard !== null)
    .map((i) => ({
      id: i.id,                  // id de la invitación (para poder salir)
      role: i.role,
      acceptedAt: i.acceptedAt,
      dashboard: i.dashboard,
    }));

  return NextResponse.json({ dashboards, sharedDashboards });
}

export async function POST(req: NextRequest) {
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
  const body = await req.json();
  const { presetId, name, description } = body;
  // Presets hardcodeados (en producción, usar una fuente centralizada)
  const PRESETS = {
    empty: {
      name: "En blanco",
      description: "Empieza desde cero, sin entidades.",
      canvasData: [],
    },
    fiesta: {
      name: "Fiesta básica",
      description: "Mesas y sillas para un evento social.",
      canvasData: [
        {"id":"area-1772463250866-0.9532723748032311-0","x":796,"y":226.5,"label":"Entrada","type":"area","rotation":0,"color":"#1d4ed8 ","areaWidth":598,"areaHeight":157,"areaLocked":false,"areaShape":"rectangle","areaVectorPoints":[{"x":-0.26588628762541805,"y":-0.5},{"x":0.28762541806020064,"y":-0.5},{"x":0.5,"y":0.5},{"x":-0.5,"y":0.5}]},
        {"id":"seat-1772463339189-0.6836968647242161","x":719,"y":219,"label":"Silla Entrada Izquierda1","type":"seat","rotation":90,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"seat-1772463341814-0.9374041051568902-0","x":687,"y":187,"label":"Silla Entrada Izquierda2","type":"seat","rotation":0,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"seat-1772463342130-0.7674840676540728-0","x":687,"y":251,"label":"Silla Entrada Izquierda3","type":"seat","rotation":180,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"seat-1772463342439-0.14252767512209652-0","x":655,"y":219,"label":"Silla Entrada Izquierda4","type":"seat","rotation":270,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"seat-1772463499196-0.4155422084203173-0","x":912,"y":157,"label":"Silla Entrada Derecha1","type":"seat","rotation":0,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"seat-1772463499196-0.9044253164900976-1","x":880,"y":157,"label":"Silla Entrada Derecha2","type":"seat","rotation":0,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"seat-1772463499196-0.5011526409714359-2","x":944,"y":189,"label":"Silla Entrada Derecha3","type":"seat","rotation":90,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"seat-1772463499196-0.6393947323896092-3","x":851,"y":156,"label":"Silla Entrada Derecha4","type":"seat","rotation":0,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"seat-1772463536286-0.9536696729407074-0","x":944,"y":221,"label":"Silla Entrada Derecha5","type":"seat","rotation":90,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"seat-1772463553668-0.417345684245377-0","x":941,"y":160,"label":"Silla Entrada Derecha6","type":"seat","rotation":37.84473040854334,"color":"#1d4ed8 ","areaId":"area-1772463250866-0.9532723748032311-0"},
        {"id":"area-1772463682061-0.3713430472403647-0","x":794,"y":420,"label":"Mesas Invitados","type":"area","rotation":0,"color":"#1d4ed8 ","areaWidth":596,"areaHeight":232,"areaLocked":false,"areaShape":"rectangle","areaVectorPoints":[{"x":-0.5,"y":-0.5},{"x":0.5,"y":-0.5},{"x":0.5,"y":0.5},{"x":-0.5,"y":0.5}]},
        {"id":"area-1772463716342-0.5653040154417769-0","x":1198.5,"y":420,"label":"Mesa Familiar","type":"area","rotation":0,"color":"#1d4ed8 ","areaWidth":213,"areaHeight":232,"areaLocked":false,"areaShape":"rectangle","areaVectorPoints":[{"x":-0.5,"y":-0.5},{"x":0.5,"y":-0.5},{"x":0.5,"y":0.5},{"x":-0.5,"y":0.5}]},
        {"id":"table-circle-1772463972393-0.32300689176869024-0","x":929,"y":420,"label":"Mesa Invitados","type":"table-circle","rotation":0,"color":"#1d4ed8 ","circleSeatCount":9,"circleSeatRadius":50,"areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463972393-0.49486864952059384-0","x":979,"y":420,"label":"Mesa Invitados - Silla 1","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463972393-0.32300689176869024-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463972393-0.17776405886756874-1","x":967.3022221559489,"y":452.139380484327,"label":"Mesa Invitados - Silla 2","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463972393-0.32300689176869024-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463972393-0.9018119228772491-2","x":937.6824088833465,"y":469.2403876506104,"label":"Mesa Invitados - Silla 3","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463972393-0.32300689176869024-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463972393-0.27097172197470254-3","x":904,"y":463.30127018922195,"label":"Mesa Invitados - Silla 4","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463972393-0.32300689176869024-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463972393-0.4430796890205215-4","x":882.0153689607046,"y":437.10100716628347,"label":"Mesa Invitados - Silla 5","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463972393-0.32300689176869024-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463972393-0.6784649610567012-5","x":882.0153689607046,"y":402.8989928337166,"label":"Mesa Invitados - Silla 6","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463972393-0.32300689176869024-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463972393-0.9568882175745198-6","x":904,"y":376.6987298107781,"label":"Mesa Invitados - Silla 7","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463972393-0.32300689176869024-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463972393-0.49863757519025664-7","x":937.6824088833465,"y":370.7596123493896,"label":"Mesa Invitados - Silla 8","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463972393-0.32300689176869024-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463994227-0.9124174577962337-8","type":"seat","parentId":"table-circle-1772463972393-0.32300689176869024-0","label":"Mesa Invitados - Silla 9","x":967.3022221559488,"y":387.860619515673,"color":"#1d4ed8 ","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"table-circle-1772463997765-0.5934040725910164-0","x":801,"y":420,"label":"Mesa invitados 2","type":"table-circle","rotation":0,"color":"#1d4ed8 ","circleSeatCount":9,"circleSeatRadius":50,"areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463997765-0.35134341580497497-1","x":851,"y":420,"label":"Mesa invitados 2 - Silla 1","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463997765-0.5934040725910164-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463997765-0.23544084390834152-2","x":839.3022221559489,"y":452.139380484327,"label":"Mesa invitados 2 - Silla 2","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463997765-0.5934040725910164-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463997765-0.9400655725556566-3","x":809.6824088833465,"y":469.2403876506104,"label":"Mesa invitados 2 - Silla 3","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463997765-0.5934040725910164-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463997765-0.39324351040346406-4","x":776,"y":463.30127018922195,"label":"Mesa invitados 2 - Silla 4","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463997765-0.5934040725910164-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463997765-0.5437308695145501-5","x":754.0153689607046,"y":437.10100716628347,"label":"Mesa invitados 2 - Silla 5","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463997765-0.5934040725910164-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463997765-0.4296116243951468-6","x":754.0153689607046,"y":402.8989928337166,"label":"Mesa invitados 2 - Silla 6","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463997765-0.5934040725910164-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463997765-0.794012925381879-7","x":776,"y":376.6987298107781,"label":"Mesa invitados 2 - Silla 7","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463997765-0.5934040725910164-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463997765-0.7697226273370529-8","x":809.6824088833465,"y":370.7596123493896,"label":"Mesa invitados 2 - Silla 8","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463997765-0.5934040725910164-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463997765-0.22914173681405625-9","type":"seat","parentId":"table-circle-1772463997765-0.5934040725910164-0","label":"Mesa invitados 2 - Silla 9","x":839.3022221559488,"y":387.860619515673,"color":"#1d4ed8 ","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"table-circle-1772463998311-0.13061576300752764-0","x":673,"y":420,"label":"Mesa Invitados 3","type":"table-circle","rotation":0,"color":"#1d4ed8 ","circleSeatCount":9,"circleSeatRadius":50,"areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463998311-0.6985242902115253-1","x":723,"y":420,"label":"Mesa Invitados 3 - Silla 1","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463998311-0.13061576300752764-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463998311-0.27340386359712743-2","x":711.3022221559489,"y":452.139380484327,"label":"Mesa Invitados 3 - Silla 2","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463998311-0.13061576300752764-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463998311-0.7533601782997339-3","x":681.6824088833465,"y":469.2403876506104,"label":"Mesa Invitados 3 - Silla 3","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463998311-0.13061576300752764-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463998311-0.2549389323140965-4","x":648,"y":463.30127018922195,"label":"Mesa Invitados 3 - Silla 4","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463998311-0.13061576300752764-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463998311-0.9498143730321819-5","x":626.0153689607046,"y":437.10100716628347,"label":"Mesa Invitados 3 - Silla 5","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463998311-0.13061576300752764-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463998311-0.9636385761368225-6","x":626.0153689607046,"y":402.8989928337166,"label":"Mesa Invitados 3 - Silla 6","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463998311-0.13061576300752764-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463998311-0.834902025835939-7","x":648,"y":376.6987298107781,"label":"Mesa Invitados 3 - Silla 7","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463998311-0.13061576300752764-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463998311-0.989105328093893-8","x":681.6824088833465,"y":370.7596123493896,"label":"Mesa Invitados 3 - Silla 8","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772463998311-0.13061576300752764-0","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"seat-1772463998311-0.7531083711683358-9","type":"seat","parentId":"table-circle-1772463998311-0.13061576300752764-0","label":"Mesa Invitados 3 - Silla 9","x":711.3022221559489,"y":387.860619515673,"color":"#1d4ed8 ","areaId":"area-1772463682061-0.3713430472403647-0"},
        {"id":"row-1772464073867-0.2149155940163413-0","x":489,"y":420,"label":"Sillas Extras","type":"row","rotation":270.6954823344406,"color":"#1d4ed8 ","rowSeatCount":5,"rowSeatSpacing":32,"rowCurvature":0},
        {"id":"seat-1772464073867-0.810166731803443-0","x":520.2208004081069,"y":484.3837061831419,"label":"Sillas Extras - Asiento 1","type":"seat","rotation":270.6954823344406,"color":"#1d4ed8 ","parentId":"row-1772464073867-0.2149155940163413-0"},
        {"id":"seat-1772464073867-0.558879907914388-1","x":520.6092214814926,"y":452.38606362826374,"label":"Sillas Extras - Asiento 2","type":"seat","rotation":270.6954823344406,"color":"#1d4ed8 ","parentId":"row-1772464073867-0.2149155940163413-0"},
        {"id":"seat-1772464073867-0.6441808811450719-2","x":520.9976425548782,"y":420.3884210733856,"label":"Sillas Extras - Asiento 3","type":"seat","rotation":270.6954823344406,"color":"#1d4ed8 ","parentId":"row-1772464073867-0.2149155940163413-0"},
        {"id":"seat-1772464073867-0.9289761512386397-3","x":521.3860636282637,"y":388.39077851850743,"label":"Sillas Extras - Asiento 4","type":"seat","rotation":270.6954823344406,"color":"#1d4ed8 ","parentId":"row-1772464073867-0.2149155940163413-0"},
        {"id":"seat-1772464073867-0.4037338711265671-4","x":521.7744847016494,"y":356.3931359636293,"label":"Sillas Extras - Asiento 5","type":"seat","rotation":270.6954823344406,"color":"#1d4ed8 ","parentId":"row-1772464073867-0.2149155940163413-0"},
        {"id":"table-rect-1772464127748-0.06267489119300829-0","x":1200,"y":420,"label":"Mesa Familiar","type":"table-rect","rotation":90,"color":"#1d4ed8 ","tableWidth":128,"tableHeight":43.2,"rectLayout":{"topSeats":4,"bottomSeats":4,"leftSeats":1,"rightSeats":1},"areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464127748-0.6457068172715493-0","x":1252,"y":372,"label":"Mesa Familiar - Silla 1","type":"seat","rotation":47.29061004263855,"color":"#1d4ed8 ","parentId":"table-rect-1772464127748-0.06267489119300829-0","areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464127748-0.5452461535231122-1","x":1252,"y":404,"label":"Mesa Familiar - Silla 2","type":"seat","rotation":72.89727103094765,"color":"#1d4ed8 ","parentId":"table-rect-1772464127748-0.06267489119300829-0","areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464127748-0.14653146795771188-2","x":1252,"y":436,"label":"Mesa Familiar - Silla 3","type":"seat","rotation":107.10272896905235,"color":"#1d4ed8 ","parentId":"table-rect-1772464127748-0.06267489119300829-0","areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464127748-0.668526890313994-3","x":1252,"y":468,"label":"Mesa Familiar - Silla 4","type":"seat","rotation":132.70938995736145,"color":"#1d4ed8 ","parentId":"table-rect-1772464127748-0.06267489119300829-0","areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464127748-0.7495355835532466-4","x":1200,"y":514.4,"label":"Mesa Familiar - Silla 5","type":"seat","rotation":180,"color":"#1d4ed8 ","parentId":"table-rect-1772464127748-0.06267489119300829-0","areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464127748-0.503062555591406-5","x":1148,"y":468,"label":"Mesa Familiar - Silla 6","type":"seat","rotation":227.2906100426385,"color":"#1d4ed8 ","parentId":"table-rect-1772464127748-0.06267489119300829-0","areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464127748-0.8158224746303455-6","x":1148,"y":436,"label":"Mesa Familiar - Silla 7","type":"seat","rotation":252.89727103094765,"color":"#1d4ed8 ","parentId":"table-rect-1772464127748-0.06267489119300829-0","areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464127748-0.5855308500840213-7","x":1148,"y":404,"label":"Mesa Familiar - Silla 8","type":"seat","rotation":287.10272896905235,"color":"#1d4ed8 ","parentId":"table-rect-1772464127748-0.06267489119300829-0","areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464158484-0.5710505989288355-8","label":"Mesa Familiar - Silla 9","type":"seat","parentId":"table-rect-1772464127748-0.06267489119300829-0","x":1148,"y":372,"rotation":312.7093899573615,"color":"#1d4ed8 ","areaId":"area-1772463716342-0.5653040154417769-0"},
        {"id":"seat-1772464158484-0.8645283301482624-9","label":"Mesa Familiar - Silla 10","type":"seat","parentId":"table-rect-1772464127748-0.06267489119300829-0","x":1200,"y":325.6,"rotation":0,"color":"#1d4ed8 ","areaId":"area-1772463716342-0.5653040154417769-0"}
      ],
    },
    corporativo: {
      name: "Evento corporativo",
      description: "Distribución tipo auditorio y áreas.",
      canvasData: [
        {"id":"area-1772468494445-0.6404677928876717-0","x":1205,"y":240,"label":"Sala pre-Reunión","type":"area","rotation":0,"color":"#1d4ed8 ","areaWidth":652,"areaHeight":302,"areaLocked":false,"areaShape":"rectangle","areaVectorPoints":[{"x":-0.5,"y":-0.5},{"x":0.5,"y":-0.5},{"x":0.5,"y":0.5},{"x":-0.5,"y":0.5}]},
        {"id":"area-1772468576600-0.8661668527672898-0","x":762,"y":260,"label":"Sala de Reunión ","type":"area","rotation":0,"color":"#1d4ed8 ","areaWidth":241,"areaHeight":342,"areaLocked":false,"areaShape":"rectangle","areaVectorPoints":[{"x":-0.5,"y":-0.5},{"x":0.5,"y":-0.5},{"x":0.5,"y":0.5},{"x":-0.5,"y":0.5}]},
        {"id":"row-1772468691135-0.54404451815385-0","x":1008,"y":80,"label":"Asientos de espera 2","type":"row","rotation":0,"color":"#1d4ed8 ","rowSeatCount":8,"rowSeatSpacing":32,"rowCurvature":0},
        {"id":"seat-1772468691135-0.6021460895779944-0","x":896,"y":112,"label":"Asientos de espera 2 - Asiento 1","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"row-1772468691135-0.54404451815385-0"},
        {"id":"seat-1772468691135-0.2619185831530283-1","x":928,"y":112,"label":"Asientos de espera 2 - Asiento 2","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"row-1772468691135-0.54404451815385-0"},
        {"id":"seat-1772468691135-0.749757933829485-2","x":960,"y":112,"label":"Asientos de espera 2 - Asiento 3","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"row-1772468691135-0.54404451815385-0"},
        {"id":"seat-1772468691135-0.5929112933596125-3","x":992,"y":112,"label":"Asientos de espera 2 - Asiento 4","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"row-1772468691135-0.54404451815385-0"},
        {"id":"seat-1772468691135-0.3842536557482156-4","x":1024,"y":112,"label":"Asientos de espera 2 - Asiento 5","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"row-1772468691135-0.54404451815385-0"},
        {"id":"seat-1772468691135-0.5553423742492952-5","x":1056,"y":112,"label":"Asientos de espera 2 - Asiento 6","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"row-1772468691135-0.54404451815385-0"},
        {"id":"seat-1772468691135-0.3726431965213032-6","x":1088,"y":112,"label":"Asientos de espera 2 - Asiento 7","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"row-1772468691135-0.54404451815385-0"},
        {"id":"seat-1772468691135-0.41557308807016347-7","x":1120,"y":112,"label":"Asientos de espera 2 - Asiento 8","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"row-1772468691135-0.54404451815385-0"},
        {"id":"row-1772468689251-0.3128034633799386-0","x":871,"y":321,"label":"Asientos de espera 1","type":"row","rotation":270,"color":"#1d4ed8 ","rowSeatCount":4,"rowSeatSpacing":32,"rowCurvature":0,"areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468689251-0.9519305516052158-0","x":903,"y":369,"label":"Asientos de espera 1 - Asiento 1","type":"seat","rotation":270,"color":"#1d4ed8 ","parentId":"row-1772468689251-0.3128034633799386-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468689251-0.05288990501182089-1","x":903,"y":337,"label":"Asientos de espera 1 - Asiento 2","type":"seat","rotation":270,"color":"#1d4ed8 ","parentId":"row-1772468689251-0.3128034633799386-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468689251-0.05225479014080647-2","x":903,"y":305,"label":"Asientos de espera 1 - Asiento 3","type":"seat","rotation":270,"color":"#1d4ed8 ","parentId":"row-1772468689251-0.3128034633799386-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468689251-0.8024843696134477-3","x":903,"y":273,"label":"Asientos de espera 1 - Asiento 4","type":"seat","rotation":270,"color":"#1d4ed8 ","parentId":"row-1772468689251-0.3128034633799386-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"table-circle-1772468682114-0.3199588311860454-0","x":1310,"y":174,"label":"Mesa charla","type":"table-circle","rotation":0,"color":"#1d4ed8 ","circleSeatCount":8,"circleSeatRadius":50,"areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468682114-0.6626788335403897-0","x":1360,"y":174,"label":"Mesa charla - Silla 1","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468682114-0.3199588311860454-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468682114-0.7720141699233519-1","x":1345.3553390593274,"y":209.35533905932738,"label":"Mesa charla - Silla 2","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468682114-0.3199588311860454-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468682114-0.15641394446243717-2","x":1310,"y":224,"label":"Mesa charla - Silla 3","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468682114-0.3199588311860454-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468682114-0.6865531173662047-3","x":1274.6446609406726,"y":209.35533905932738,"label":"Mesa charla - Silla 4","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468682114-0.3199588311860454-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468682114-0.9216225065266103-4","x":1260,"y":174,"label":"Mesa charla - Silla 5","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468682114-0.3199588311860454-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468682114-0.6534314022463247-5","x":1274.6446609406726,"y":138.64466094067262,"label":"Mesa charla - Silla 6","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468682114-0.3199588311860454-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468682114-0.6069992593481841-6","x":1310,"y":124,"label":"Mesa charla - Silla 7","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468682114-0.3199588311860454-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468682114-0.0475760922106917-7","x":1345.3553390593274,"y":138.64466094067262,"label":"Mesa charla - Silla 8","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468682114-0.3199588311860454-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"table-circle-1772468686211-0.26790340281172165-0","x":1456,"y":176,"label":"Mesa charla2","type":"table-circle","rotation":0,"color":"#1d4ed8 ","circleSeatCount":8,"circleSeatRadius":50,"areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468686211-0.7782697251287334-0","x":1506,"y":176,"label":"Mesa charla2 - Silla 1","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468686211-0.26790340281172165-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468686211-0.010017812821792815-1","x":1491.3553390593274,"y":211.35533905932738,"label":"Mesa charla2 - Silla 2","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468686211-0.26790340281172165-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468686211-0.7181289729106088-2","x":1456,"y":226,"label":"Mesa charla2 - Silla 3","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468686211-0.26790340281172165-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468686211-0.5744149863227018-3","x":1420.6446609406726,"y":211.35533905932738,"label":"Mesa charla2 - Silla 4","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468686211-0.26790340281172165-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468686211-0.07272973203709332-4","x":1406,"y":176,"label":"Mesa charla2 - Silla 5","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468686211-0.26790340281172165-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468686211-0.23994669178469208-5","x":1420.6446609406726,"y":140.64466094067262,"label":"Mesa charla2 - Silla 6","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468686211-0.26790340281172165-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468686211-0.9577560251857969-6","x":1456,"y":126,"label":"Mesa charla2 - Silla 7","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468686211-0.26790340281172165-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"seat-1772468686211-0.2206011937149639-7","x":1491.3553390593274,"y":140.64466094067262,"label":"Mesa charla2 - Silla 8","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-circle-1772468686211-0.26790340281172165-0","areaId":"area-1772468494445-0.6404677928876717-0"},
        {"id":"table-rect-1772468687600-0.3112399223173915-0","x":762,"y":256,"label":"Mesa Reunion","type":"table-rect","rotation":270,"color":"#1d4ed8 ","tableWidth":224,"tableHeight":43.2,"rectLayout":{"topSeats":7,"bottomSeats":7,"leftSeats":1,"rightSeats":1},"areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468687600-0.9148374558802705-0","x":710,"y":352,"label":"Mesa Reunion - Silla 1","type":"seat","rotation":208.44292862436328,"color":"#1d4ed8 ","parentId":"table-rect-1772468687600-0.3112399223173915-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468687600-0.0932358141321673-1","x":710,"y":320,"label":"Mesa Reunion - Silla 2","type":"seat","rotation":219.09385888622955,"color":"#1d4ed8 ","parentId":"table-rect-1772468687600-0.3112399223173915-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468687600-0.5127584331946262-2","x":710,"y":288,"label":"Mesa Reunion - Silla 3","type":"seat","rotation":238.39249775375106,"color":"#1d4ed8 ","parentId":"table-rect-1772468687600-0.3112399223173915-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468687600-0.05272634043169522-3","x":710,"y":256,"label":"Mesa Reunion - Silla 4","type":"seat","rotation":270,"color":"#1d4ed8 ","parentId":"table-rect-1772468687600-0.3112399223173915-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468687600-0.4047891989382535-4","x":710,"y":224,"label":"Mesa Reunion - Silla 5","type":"seat","rotation":301.60750224624894,"color":"#1d4ed8 ","parentId":"table-rect-1772468687600-0.3112399223173915-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468687600-0.674039933050026-5","x":710,"y":192,"label":"Mesa Reunion - Silla 6","type":"seat","rotation":320.90614111377045,"color":"#1d4ed8 ","parentId":"table-rect-1772468687600-0.3112399223173915-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468687600-0.8909636955867607-6","x":710,"y":160,"label":"Mesa Reunion - Silla 7","type":"seat","rotation":331.5570713756367,"color":"#1d4ed8 ","parentId":"table-rect-1772468687600-0.3112399223173915-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468687600-0.6598894449224729-7","x":762,"y":113.6,"label":"Mesa Reunion - Silla 8","type":"seat","rotation":0,"color":"#1d4ed8 ","parentId":"table-rect-1772468687600-0.3112399223173915-0","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468785788-0.037239102908521726-8","label":"Mesa Reunion - Silla 9","type":"seat","parentId":"table-rect-1772468687600-0.3112399223173915-0","x":814,"y":160,"rotation":28.442928624363333,"color":"#1d4ed8 ","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468785788-0.2963519283656997-9","label":"Mesa Reunion - Silla 10","type":"seat","parentId":"table-rect-1772468687600-0.3112399223173915-0","x":814,"y":192,"rotation":39.0938588862295,"color":"#1d4ed8 ","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468786489-0.278444350974445-10","label":"Mesa Reunion - Silla 11","type":"seat","parentId":"table-rect-1772468687600-0.3112399223173915-0","x":814,"y":224,"rotation":58.392497753751115,"color":"#1d4ed8 ","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468786489-0.15926681872768556-11","label":"Mesa Reunion - Silla 12","type":"seat","parentId":"table-rect-1772468687600-0.3112399223173915-0","x":814,"y":256,"rotation":90,"color":"#1d4ed8 ","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468787522-0.4577371396740223-12","label":"Mesa Reunion - Silla 13","type":"seat","parentId":"table-rect-1772468687600-0.3112399223173915-0","x":814,"y":288,"rotation":121.60750224624888,"color":"#1d4ed8 ","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468787522-0.41722955818473995-13","label":"Mesa Reunion - Silla 14","type":"seat","parentId":"table-rect-1772468687600-0.3112399223173915-0","x":814,"y":320,"rotation":140.9061411137705,"color":"#1d4ed8 ","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468788144-0.18965452024013663-14","label":"Mesa Reunion - Silla 15","type":"seat","parentId":"table-rect-1772468687600-0.3112399223173915-0","x":814,"y":352,"rotation":151.55707137563667,"color":"#1d4ed8 ","areaId":"area-1772468576600-0.8661668527672898-0"},
        {"id":"seat-1772468788144-0.5506892675873208-15","label":"Mesa Reunion - Silla 16","type":"seat","parentId":"table-rect-1772468687600-0.3112399223173915-0","x":762,"y":398.4,"rotation":180,"color":"#1d4ed8 ","areaId":"area-1772468576600-0.8661668527672898-0"}
      ],
    },
  };
  const preset = PRESETS[presetId as keyof typeof PRESETS];
  if (!preset) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
  }
  const dashboard = await prisma.dashboard.create({
    data: {
      ownerId: user.id,
      name: name || preset.name,
      description: description || preset.description,
      canvasData: preset.canvasData,
      visibility: "PRIVATE",
      presetId: presetId,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: dashboard.id });
}
