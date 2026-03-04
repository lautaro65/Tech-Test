/*
  Warnings:

  - You are about to drop the `Tutorial` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TutorialMobile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tutorial" DROP CONSTRAINT "Tutorial_userId_fkey";

-- DropForeignKey
ALTER TABLE "TutorialMobile" DROP CONSTRAINT "TutorialMobile_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isViewTutorial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isViewTutorialMobile" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Tutorial";

-- DropTable
DROP TABLE "TutorialMobile";
