import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";

import { app } from "../app";
import prisma from "..//database/prisma";
import jwt from "jsonwebtoken";
import { authConfig } from "..//config/auth";
import { hash } from "bcrypt";

describe("ServicesController", () => {
  const adminEmail = "admin_services_controller_test@test.com";
  const testServiceTitles = [
    "services_controller_test_format_pc",
    "services_controller_test_backup_cloud",
    "services_controller_test_cleaning_hardware",
    "services_controller_test_created_now",
  ];

  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    const { secret, expiresIn } = authConfig.jwt;
    const hashedPassword = await hash("password123", 8);

    await prisma.services.deleteMany({
      where: { title: { in: testServiceTitles } },
    });
    await prisma.users.deleteMany({ where: { email: adminEmail } });

    const adminUser = await prisma.users.create({
      data: {
        name: "admin_services_controller_test",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      },
    });
    adminId = adminUser.id;

    adminToken = jwt.sign({ role: adminUser.role }, secret, {
      subject: String(adminUser.id),
      expiresIn,
    });
  });

  beforeEach(async () => {
    await prisma.services.deleteMany({
      where: { title: { in: testServiceTitles } },
    });
  });

  afterAll(async () => {
    await prisma.services.deleteMany({
      where: { title: { in: testServiceTitles } },
    });
    await prisma.users.deleteMany({ where: { email: adminEmail } });
    await prisma.$disconnect();
  });

  // --- TESTE DE CRIAÇÃO (POST /services) ---

  describe("POST /services", () => {
    it("should create a new service successfully", async () => {
      const response = await request(app)
        .post("/services")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "services_controller_test_created_now",
          price: 150.0,
        });

      expect(response.status).toBe(201);
      expect(response.body.service).toHaveProperty("id");
      expect(response.body.service.title).toBe(
        "services_controller_test_created_now",
      );
      expect(response.body.service.price).toBe("150");
    });

    it("should return error if title has fewer than 6 characters", async () => {
      const response = await request(app)
        .post("/services")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "short",
          price: 50.0,
        });

      expect(response.status).toBe(400); // Zod barrou
    });
  });

  // --- TESTE DE LISTAGEM (GET /services) ---

  describe("GET /services", () => {
    it("should list services and include the ones from the test", async () => {
      // Injeta serviços controlados
      await prisma.services.createMany({
        data: [
          { title: "services_controller_test_format_pc", price: 100.0 },
          { title: "services_controller_test_backup_cloud", price: 250.0 },
        ],
      });

      const response = await request(app)
        .get("/services/admin")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(201);

      const formattedPcService = response.body.find(
        (s: any) => s.title === "services_controller_test_format_pc",
      );
      const backupService = response.body.find(
        (s: any) => s.title === "services_controller_test_backup_cloud",
      );

      expect(formattedPcService).toBeDefined();
      expect(String(formattedPcService.price)).toBe("100");
      expect(backupService).toBeDefined();
      expect(String(backupService.price)).toBe("250");
    });
  });

  // --- TESTE DE ATUALIZAÇÃO (PATCH /services/update/:id) ---

  describe("PATCH /services/update/:id", () => {
    it("should update title and price of an existing service", async () => {
      const service = await prisma.services.create({
        data: {
          title: "services_controller_test_cleaning_hardware",
          price: 80.0,
        },
      });

      const response = await request(app)
        .patch(`/services/update/${service.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "services_controller_test_format_pc",
          price: 120,
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("services_controller_test_format_pc");
      expect(response.body.price).toBe("120");
    });

    it("should return 404 when trying to update a non-existing service id", async () => {
      const fakeUuid = "00000000-0000-0000-0000-000000000000";

      const response = await request(app)
        .patch(`/services/update/${fakeUuid}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "services_controller_test_format_pc" });

      expect(response.status).toBe(404);
    });
  });

  // --- TESTE DE SOFT DELETE / ALTERAÇÃO DE STATUS (PATCH /services/status/:id) ---

  describe("PATCH /services/status/:id (Soft Delete)", () => {
    it("should toggle service status from true to false (deactivate)", async () => {
      const service = await prisma.services.create({
        data: {
          title: "services_controller_test_cleaning_hardware",
          price: 80.0,
          status: true,
        },
      });

      const response = await request(app)
        .patch(`/services/status/${service.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(false);
    });

    it("should toggle service status from false to true (reactivate)", async () => {
      const service = await prisma.services.create({
        data: {
          title: "services_controller_test_cleaning_hardware",
          price: 80.0,
          status: false,
        },
      });

      const response = await request(app)
        .patch(`/services/status/${service.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
    });
  });
});
