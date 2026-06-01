/**
 * Seed inicial de AdZenda
 * Ejecutar: npx prisma db seed
 * O manualmente: npx tsx prisma/seed.ts
 *
 * Variables de entorno requeridas:
 *   DATABASE_URL       — conexión a PostgreSQL
 *   META_TOKEN_ENCRYPTION_KEY — clave de 64 hex chars
 *   ADMIN_EMAIL        — email del admin (default: admin@adzenda.com)
 *   ADMIN_PASSWORD     — contraseña del admin (requerida)
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@adzenda.com";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD es requerida. Ejemplo: ADMIN_PASSWORD=secreto npx prisma db seed"
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log(`✓ Usuario admin listo: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error("✗ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
