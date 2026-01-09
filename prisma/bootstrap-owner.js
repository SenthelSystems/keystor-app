// prisma/bootstrap-owner.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "contact@senthel.com";
  const ownerName = "Senthel Admin";
  const orgName = "Senthel Systems";
  const orgSlug = "senthel-systems";
  const password = process.env.BOOTSTRAP_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error(
      "Missing BOOTSTRAP_PASSWORD (min 8 chars). Example: set BOOTSTRAP_PASSWORD and re-run."
    );
  }

  console.log("Bootstrapping first OWNER...");

  // Create or fetch org
  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: { name: orgName },
    create: { name: orgName, slug: orgSlug },
    select: { id: true, name: true, slug: true },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  // Create or update owner
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: ownerName,
      passwordHash,
      role: "OWNER",
      organizationId: org.id,
    },
    create: {
      email,
      name: ownerName,
      passwordHash,
      role: "OWNER",
      organizationId: org.id,
    },
    select: { id: true, email: true, role: true, organizationId: true },
  });

  // Ensure tenant profile doesn't exist for owner (safe no-op if your schema doesn't have it)
  // If your schema has tenantProfile required only for tenants, this won't matter.

  console.log("✅ Owner ready:");
  console.log({ email: user.email, role: user.role, organization: org.name });
  console.log("Login at /login using the BOOTSTRAP_PASSWORD you set.");
}

main()
  .catch((e) => {
    console.error("❌ Bootstrap failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
