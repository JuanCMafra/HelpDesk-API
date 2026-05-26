import prisma from "@/database/prisma";
import { hash } from "bcrypt";
import jwt from "jsonwebtoken";
import { authConfig } from "@/config/auth";
import crypto from "crypto"; // Nativo do Node
import { hours } from "@/utils/TechnicianAvailability"; // Substitua pelo caminho correto do seu arquivo de horas

type Role = "admin" | "technician" | "customer";

interface CreateUserFactoryOptions {
  role?: Role;
  availability?: string[]; // Permite passar horários específicos no teste se quiser
}

interface CreateUserFactoryResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  technicianProfileId?: string;
}

export async function createMockUser({
  role = "customer",
  availability,
}: CreateUserFactoryOptions = {}): Promise<CreateUserFactoryResponse> {
  const { secret, expiresIn } = authConfig.jwt;

  const uniqueId = crypto.randomUUID().substring(0, 8);
  const name = `Test ${role.toUpperCase()} ${uniqueId}`;
  const email = `${role}_${uniqueId}@testdesk.com`;
  const hashedPassword = await hash("password123", 8);

  const user = await prisma.users.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
  });

  let technicianProfileId: string | undefined;

  if (role === "technician") {
    const defaultAvailability = availability ?? [hours[0], hours[1], hours[2]]; 

    const profile = await prisma.technicianProfile.create({
      data: {
        userId: user.id,
        availability: defaultAvailability,
        active: true,
      },
    });
    technicianProfileId = profile.id;
  }

  const token = jwt.sign({ role: user.role }, secret, {
    subject: String(user.id),
    expiresIn: expiresIn,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
    },
    technicianProfileId,
  };
}
