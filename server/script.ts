import { PrismaClient, Status } from "./src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const getAuditLogs = async () => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
      include: { user: true },
    });
  };

  await getAuditLogs();
}

main()
  .catch((e) => {
    console.error("Transaction failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
