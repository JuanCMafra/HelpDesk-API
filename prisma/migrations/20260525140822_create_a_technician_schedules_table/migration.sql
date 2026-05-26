-- CreateEnum
CREATE TYPE "scheduleStatus" AS ENUM ('booked', 'finished');

-- CreateTable
CREATE TABLE "technician_schedule" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "status" "scheduleStatus" NOT NULL DEFAULT 'booked',
    "date" TIMESTAMP(3) NOT NULL,
    "hour" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technician_schedule_ticketId_key" ON "technician_schedule"("ticketId");

-- AddForeignKey
ALTER TABLE "technician_schedule" ADD CONSTRAINT "technician_schedule_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technician_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_schedule" ADD CONSTRAINT "technician_schedule_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
