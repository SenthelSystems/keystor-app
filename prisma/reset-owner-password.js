// prisma/reset-owner-password.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "contact@senthel.com";
  const password = process.env.RESET_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error("Set RESET_PASSWORD (min 8 chars) before running.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      role: "OWNER",
    },
  });

  console.log("✅ Password reset OK for:", { email: user.email, role: user.role });
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
