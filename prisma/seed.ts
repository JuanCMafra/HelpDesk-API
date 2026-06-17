import prisma from "@/database/prisma";
import { env } from "@/env";
import bcrypt from "bcrypt";

async function seed() {
  const adminPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await prisma.users.upsert({
    where: {
      email: "admin@email.com",
    },

    update: {
      password: adminPassword,
    },

    create: {
      name: "admin",
      email: "admin@email.com",
      password: adminPassword,
      role: "admin",
    },
  });

  // TECHNICIANS
  const technicians = [
    {
      name: "technician1",
      email: "technician1@email.com",
      password: "technician1",

      availability: [
        "08:00",
        "09:00",
        "10:00",
        "11:00",

        "14:00",
        "15:00",
        "16:00",
        "17:00",
      ],
    },

    {
      name: "technician2",
      email: "technician2@email.com",
      password: "technician2",

      availability: [
        "10:00",
        "11:00",
        "12:00",
        "13:00",

        "16:00",
        "17:00",
        "18:00",
        "19:00",
      ],
    },

    {
      name: "technician3",
      email: "technician3@email.com",
      password: "technician3",

      availability: [
        "12:00",
        "13:00",
        "14:00",
        "15:00",

        "18:00",
        "19:00",
        "20:00",
        "21:00",
      ],
    },
  ];

  for (const technician of technicians) {
    const passwordHash = await bcrypt.hash(technician.password, 10);

    const user = await prisma.users.upsert({
      where: {
        email: technician.email,
      },

      update: {},

      create: {
        name: technician.name,
        email: technician.email,
        password: passwordHash,
        role: "technician",
      },
    });

    await prisma.technicianProfile.upsert({
      where: {
        userId: user.id,
      },

      update: {},

      create: {
        userId: user.id,
        availability: technician.availability,
        active: true,
      },
    });
  }

  // SERVICES
  const services = [
    {
      title: "Instalação e atualização de softwares",
      price: 120,
    },

    {
      title: "Instalação e atualização de hardwares",
      price: 180,
    },

    {
      title: "Diagnóstico e remoção de vírus",
      price: 150,
    },

    {
      title: "Suporte a impressoras",
      price: 90,
    },

    {
      title: "Suporte a periféricos",
      price: 80,
    },

    {
      title: "Solução de problemas de conectividade de internet",
      price: 140,
    },

    {
      title: "Backup e recuperação de dados",
      price: 200,
    },

    {
      title: "Otimização de desempenho do sistema operacional",
      price: 160,
    },

    {
      title: "Configuração de VPN e acesso remoto",
      price: 220,
    },
  ];

  for (const service of services) {
    await prisma.services.upsert({
      where: {
        title: service.title,
      },

      update: {},

      create: {
        title: service.title,
        price: service.price,
        status: true,
      },
    });
  }

  console.log("Seed executada com sucesso!");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
