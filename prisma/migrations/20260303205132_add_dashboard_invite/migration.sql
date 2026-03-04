/*
  Warnings:

  - You are about to drop the `DashboardShare` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DashboardShare" DROP CONSTRAINT "DashboardShare_dashboardId_fkey";

-- DropForeignKey
ALTER TABLE "DashboardShare" DROP CONSTRAINT "DashboardShare_userId_fkey";

-- DropTable
DROP TABLE "DashboardShare";

-- CreateTable
CREATE TABLE "DashboardInvite" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "ShareRole" NOT NULL DEFAULT 'VIEWER',
    "email" TEXT,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DashboardInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardInvite_token_key" ON "DashboardInvite"("token");

-- CreateIndex
CREATE INDEX "DashboardInvite_dashboardId_idx" ON "DashboardInvite"("dashboardId");

-- CreateIndex
CREATE INDEX "DashboardInvite_token_idx" ON "DashboardInvite"("token");

-- AddForeignKey
ALTER TABLE "DashboardInvite" ADD CONSTRAINT "DashboardInvite_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardInvite" ADD CONSTRAINT "DashboardInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
