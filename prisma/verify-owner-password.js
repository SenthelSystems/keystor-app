const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "contact@senthel.com";
  const password = process.env.TEST_PASSWORD;

  if (!password) throw new Error("Set TEST_PASSWORD before running.");

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { email: true, role: true, passwordHash: true },
  });

  if (!user) {
    console.log("❌ User not found:", email);
    return;
  }

  console.log("User:", { email: user.email, role: user.role, hashLen: user.passwordHash?.length });

  if (!user.passwordHash) {
    console.log("❌ No passwordHash in DB.");
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log(ok ? "✅ Password MATCHES hash" : "❌ Password does NOT match hash");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
