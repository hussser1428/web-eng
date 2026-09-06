// Dùng: npm run db:make-admin -- email@vidu.com
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Cách dùng: npm run db:make-admin -- email@vidu.com");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    console.log(`Đã cấp quyền admin cho ${user.email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
