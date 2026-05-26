-- DropForeignKey
ALTER TABLE "technician_schedule" DROP CONSTRAINT "technician_schedule_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "tickets_services" DROP CONSTRAINT "tickets_services_ticket_id_fkey";

-- AddForeignKey
ALTER TABLE "tickets_services" ADD CONSTRAINT "tickets_services_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_schedule" ADD CONSTRAINT "technician_schedule_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
