import { Request, Response, NextFunction } from "express";
import z, { ZodError } from "zod";
import { AppError } from "@/utils/AppError";
import prisma from "@/database/prisma";
import { compare, hash } from "bcrypt";
import uploadConfig from "@/config/upload";
import { DiskStorage } from "@/providers/disk-storage";
import { hours } from "@/utils/TechnicianAvailability";

class ProfileController {
  async update(req: Request, res: Response, next: NextFunction) {
    const bodySchema = z.object({
      name: z
        .string()
        .trim()
        .min(5, "Nome e sobrenome deve ter mais de 5 letras!")
        .optional(),

      email: z.email("E-mail inválido!").optional(),

      availability: z
        .array(z.enum(hours))
        .min(1, "Selecione ao menos um horário!")
        .optional(),
    });

    const { name, email, availability } = bodySchema.parse(req.body);

    if (name) {
      await prisma.users.update({
        where: {
          id: req.user?.id,
        },

        data: {
          name,
        },
      });
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      const userWithSameEmail = await prisma.users.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (userWithSameEmail && userWithSameEmail.id !== req.user?.id) {
        return next(new AppError("Esse e-mail já existe!"));
      }

      await prisma.users.update({
        where: {
          id: req.user?.id,
        },

        data: {
          email: normalizedEmail,
        },
      });
    }

    if (req.user?.role === "technician" && availability) {
      await prisma.technicianProfile.update({
        where: {
          userId: req.user.id,
        },

        data: {
          availability,
        },
      });
    }

    const updatedUser = await prisma.users.findUnique({
      where: {
        id: req.user?.id,
      },

      include: {
        technician: true,
      },
    });

    const showProfileUpdated = {
      user_id: updatedUser?.id,
      name: updatedUser?.name,
      email: updatedUser?.email,
      availability: updatedUser?.technician?.availability,
    };

    return res.status(200).json({ showProfileUpdated });
  }

  async updatePassword(req: Request, res: Response, next: NextFunction) {
    const bodySchema = z
      .object({
        currentPassword: z.string(),
        newPassword: z
          .string()
          .min(6, "A senha deve possuir mais que 6 caracteres!"),
      })
      .refine((p) => p.currentPassword !== p.newPassword, {
        message: "A nova senha deve ser diferente!",
      });

    const { currentPassword, newPassword } = bodySchema.parse(req.body);

    const user = await prisma.users.findUnique({
      where: {
        id: req.user?.id,
      },
    });

    if (user) {
      const passwordMatched = await compare(currentPassword, user.password);

      if (!passwordMatched) {
        return next(new AppError("Senha incorreta!", 401));
      }
    } else {
      return next(new AppError("Usuário não encontrado!", 404));
    }

    const hashedNewPassword = await hash(newPassword, 8);

    await prisma.users.update({
      where: { id: req.user?.id },
      data: { password: hashedNewPassword },
    });

    return res.status(200).json();
  }

  async createAvatar(req: Request, res: Response, next: NextFunction) {
    const diskStorage = new DiskStorage();

    try {
      const fileSchema = z
        .object({
          filename: z.string().min(1, "Arquivo é obrigatório"),
          mimetype: z
            .string()
            .refine(
              (t) => uploadConfig.ACCEPTED_IMAGE_TYPES.includes(t),
              `Formatos permitidos: ${uploadConfig.ACCEPTED_IMAGE_TYPES}`,
            ),
          size: z
            .number()
            .positive()
            .refine(
              (s) => s <= uploadConfig.MAX_FILE_SIZE,
              `Arquivo excede o tamanho máximo de ${uploadConfig.MAX_SIZE} megabytes`,
            ),
        })
        .loose();

      const file = fileSchema.parse(req.file);

      const user = await prisma.users.findUnique({
        where: {
          id: req.user?.id,
        },
      });

      if (!user) {
        throw new AppError("Usuário não encontrado");
      }

      if (user.avatar) {
        await diskStorage.deleteFile(user.avatar, "upload");
      }

      const filename = await diskStorage.saveFile(file.filename);

      await prisma.users.update({
        where: {
          id: req.user?.id,
        },
        data: {
          avatar: filename,
        },
      });

      return res.status(201).json({ filename });
    } catch (error) {
      if (error instanceof ZodError) {
        if (req.file) {
          await diskStorage.deleteFile(req.file.filename, "tmp");
        }
        return next(new AppError(error.issues[0].message));
      }

      throw error;
    }
  }

  async deleteAvatar(req: Request, res: Response, next: NextFunction) {
    const diskStorage = new DiskStorage();

    const user = await prisma.users.findUnique({
      where: {
        id: req.user?.id,
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado");
    }

    if (!user.avatar) {
      throw new AppError("Usuário não possui foto de perfil!");
    }

    await diskStorage.deleteFile(user.avatar, "upload");

    await prisma.users.update({
      where: {
        id: req.user?.id,
      },
      data: {
        avatar: null,
      },
    });

    return res.json();
  }
}

export { ProfileController };
