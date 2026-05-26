/*
  Warnings:

  - A unique constraint covering the columns `[technicianId,date,hour]` on the table `technician_schedule` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "technician_schedule_technicianId_date_hour_key" ON "technician_schedule"("technicianId", "date", "hour");
