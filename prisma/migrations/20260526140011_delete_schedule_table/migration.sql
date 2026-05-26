/*
  Warnings:

  - You are about to drop the `technician_schedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "technician_schedule" DROP CONSTRAINT "technician_schedule_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "technician_schedule" DROP CONSTRAINT "technician_schedule_ticketId_fkey";

-- DropTable
DROP TABLE "technician_schedule";
