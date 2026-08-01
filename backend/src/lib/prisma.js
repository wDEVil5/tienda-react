import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

// Prisma 7 conecta mediante un adaptador del driver `pg`. La API reutiliza esta
// única instancia para no abrir un pool de conexiones por cada petición.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL es obligatoria para conectar con PostgreSQL.");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
