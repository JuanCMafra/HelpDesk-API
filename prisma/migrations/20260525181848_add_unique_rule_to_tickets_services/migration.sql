/*
  Warnings:

  - A unique constraint covering the columns `[service_id,type,ticket_id]` on the table `tickets_services` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "tickets_services_service_id_type_ticket_id_key" ON "tickets_services"("service_id", "type", "ticket_id");
