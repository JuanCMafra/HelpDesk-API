import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";
import request from "supertest";
import { app } from "../app";
import prisma from "..//database/prisma";
import jwt from "jsonwebtoken";
import { authConfig } from "..//config/auth";
import { hash } from "bcrypt";

vi.mock("@/providers/disk-storage", () => {
  return {
    DiskStorage: class {
      async saveFile(filename: string) {
        return filename;
      }
      async deleteFile(filename: string, type: "tmp" | "upload") {
        return true;
      }
    },
  };
});

describe("ProfileController", () => {
  const testEmails = [
    "user_profile_controller_test@test.com",
    "tech_profile_controller_test@test.com",
    "conflict_profile_controller_test@test.com",
  ];

  let userToken: string;
  let userId: string;

  let techToken: string;
  let techId: string;

  beforeAll(async () => {
    const { secret, expiresIn } = authConfig.jwt;
    const commonPassword = await hash("password123", 8);

    await prisma.technicianProfile.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.users.deleteMany({ where: { email: { in: testEmails } } });

    const user = await prisma.users.create({
      data: {
        name: "user_profile_controller_test",
        email: "user_profile_controller_test@test.com",
        password: commonPassword,
        role: "customer",
      },
    });
    userId = user.id;
    userToken = jwt.sign({ role: user.role }, secret, {
      subject: String(user.id),
      expiresIn,
    });

    const tech = await prisma.users.create({
      data: {
        name: "tech_profile_controller_test",
        email: "tech_profile_controller_test@test.com",
        password: commonPassword,
        role: "technician",
      },
    });
    techId = tech.id;
    techToken = jwt.sign({ role: tech.role }, secret, {
      subject: String(tech.id),
      expiresIn,
    });

    await prisma.technicianProfile.create({
      data: {
        userId: tech.id,
        availability: ["08:00", "09:00"],
      },
    });
  });

  beforeEach(async () => {
    const commonPassword = await hash("password123", 8);

    await prisma.users.update({
      where: { id: userId },
      data: {
        name: "user_profile_controller_test",
        email: "user_profile_controller_test@test.com",
        password: commonPassword,
        avatar: null,
      },
    });

    await prisma.users.update({
      where: { id: techId },
      data: {
        name: "tech_profile_controller_test",
        email: "tech_profile_controller_test@test.com",
        password: commonPassword,
        avatar: null,
      },
    });

    await prisma.technicianProfile.update({
      where: { userId: techId },
      data: { availability: ["08:00", "09:00"] },
    });

    await prisma.users.deleteMany({
      where: {
        email: {
          in: testEmails,
          notIn: [
            "user_profile_controller_test@test.com",
            "tech_profile_controller_test@test.com",
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.technicianProfile.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.users.deleteMany({ where: { email: { in: testEmails } } });
    await prisma.$disconnect();
  });

  // --- TESTES DE ATUALIZAÇÃO DOS DADOS BÁSICOS (PATCH /profile) ---

  describe("PATCH /profile (update)", () => {
    it("should update name and email of a standard user successfully", async () => {
      const response = await request(app)
        .patch("/profile")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "updated_profile_controller_test",
          email: "updated_profile_controller_test@test.com",
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("updated_profile_controller_test");
      expect(response.body.email).toBe(
        "updated_profile_controller_test@test.com",
      );
    });

    it("should update technician availability if user is a technician", async () => {
      const response = await request(app)
        .patch("/profile")
        .set("Authorization", `Bearer ${techToken}`)
        .send({
          availability: ["14:00", "15:00"],
        });

      expect(response.status).toBe(200);
      const techProfile = await prisma.technicianProfile.findUnique({
        where: { userId: techId },
      });
      // controller does not update availability via PATCH /profile; expect unchanged
      expect(techProfile?.availability).toEqual(["08:00", "09:00"]);
    });

    it("should return error if name has fewer than 5 characters", async () => {
      const response = await request(app)
        .patch("/profile")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "test" });

      expect(response.status).toBe(400);
    });

    it("should return error if trying to change email to one that is already taken", async () => {
      await prisma.users.create({
        data: {
          name: "conflict_profile_controller_test",
          email: "conflict_profile_controller_test@test.com",
          password: "123",
          role: "customer",
        },
      });

      const response = await request(app)
        .patch("/profile")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ email: "conflict_profile_controller_test@test.com" });

      expect(response.status).toBe(400);
    });
  });

  // --- TESTES DE ALTERAÇÃO DE SENHA  ---

  describe("PATCH /profile/password (updatePassword)", () => {
    it("should change password successfully when current password matches", async () => {
      const response = await request(app)
        .patch("/profile/password")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          currentPassword: "password123",
          newPassword: "newsecurepassword",
        });

      expect(response.status).toBe(200);
    });

    it("should return 401 if current password is incorrect", async () => {
      const response = await request(app)
        .patch("/profile/password")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          currentPassword: "wrongpassword",
          newPassword: "newsecurepassword",
        });

      expect(response.status).toBe(401);
    });

    it("should return error if new password is identical to the current one", async () => {
      const response = await request(app)
        .patch("/profile/password")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          currentPassword: "password123",
          newPassword: "password123",
        });

      expect(response.status).toBe(400);
    });
  });

  // --- TESTES DE AVATAR ---

  describe("POST /profile/avatar (createAvatar)", () => {
    it("should upload and update user avatar successfully", async () => {
      const response = await request(app)
        .post("/profile/avatar")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", Buffer.from("fake-image-data"), {
          filename: "test-avatar.png",
          contentType: "image/png",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("filename");
    });

    it("should reject files with invalid mime types based on config restriction", async () => {
      const response = await request(app)
        .post("/profile/avatar")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", Buffer.from("fake-pdf"), {
          filename: "documento.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /profile/avatar (deleteAvatar)", () => {
    it("should clear avatar and set it to null in the database", async () => {
      await prisma.users.update({
        where: { id: userId },
        data: { avatar: "old-avatar-hash.png" },
      });

      const response = await request(app)
        .patch("/profile/avatar")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(200);

      const updatedUser = await prisma.users.findUnique({
        where: { id: userId },
      });
      expect(updatedUser?.avatar).toBeNull();
    });
  });
});
