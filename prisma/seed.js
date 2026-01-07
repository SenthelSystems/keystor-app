// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding KeyStor database...");

  const password = "test123";
  const passwordHash = await bcrypt.hash(password, 10);

  const org = await prisma.organization.upsert({
    where: { slug: "keystor-demo" },
    update: { name: "KeyStor Demo Org" },
    create: { slug: "keystor-demo", name: "KeyStor Demo Org" },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@keystor.com" },
    update: {
      name: "KeyStor Owner",
      role: "OWNER",
      organizationId: org.id,
    },
    create: {
      email: "owner@keystor.com",
      name: "KeyStor Owner",
      passwordHash,
      role: "OWNER",
      organizationId: org.id,
    },
  });

  const tenant = await prisma.user.upsert({
    where: { email: "tenant@keystor.com" },
    update: {
      name: "Test Tenant",
      role: "TENANT",
      organizationId: org.id,
    },
    create: {
      email: "tenant@keystor.com",
      name: "Test Tenant",
      passwordHash,
      role: "TENANT",
      organizationId: org.id,
      tenantProfile: {
        create: {
          phone: "555-555-5555",
          emergencyContact: "John Doe - 555-123-4567",
        },
      },
    },
  });

  const property = await prisma.property.create({
    data: {
      organizationId: org.id,
      name: "KeyStor Demo Property",
      type: "SFR_PORTFOLIO",
      address: "123 KeyStor Way",
      city: "Chiefland",
      state: "FL",
      postalCode: "32626",
      notes: "Demo property for KeyStor v1.",
    },
  });

  await prisma.unit.createMany({
    data: [
      {
        organizationId: org.id,
        propertyId: property.id,
        label: "Unit 1",
        category: "SFR",
        status: "VACANT",
        baseRentCents: 180000,
      },
      {
        organizationId: org.id,
        propertyId: property.id,
        label: "Unit 2",
        category: "SFR",
        status: "VACANT",
        baseRentCents: 170000,
      },
      {
        organizationId: org.id,
        propertyId: property.id,
        label: "Unit 3",
        category: "DUPLEX",
        status: "VACANT",
        baseRentCents: 250000,
      },
    ],
  });

    // Add a couple maintenance requests (Service module demo)
  const firstUnit = await prisma.unit.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });

  if (firstUnit) {
    await prisma.maintenanceRequest.createMany({
      data: [
        {
          organizationId: org.id,
          tenantId: tenant.id,
          unitId: firstUnit.id,
          title: "Gate code not working",
          description:
            "Tenant reports the access code failed twice last night. Please verify and reset if needed.",
          priority: "HIGH",
          status: "OPEN",
        },
        {
          organizationId: org.id,
          tenantId: tenant.id,
          unitId: firstUnit.id,
          title: "Light fixture out",
          description:
            "Exterior light near the unit entrance is out. Needs bulb replacement or fixture check.",
          priority: "MEDIUM",
          status: "IN_PROGRESS",
        },
      ],
    });
  }


  console.log("Seed complete ✅");
  console.log("ORG:", { name: org.name, slug: org.slug });
  console.log("OWNER:", { email: owner.email, password });
  console.log("TENANT:", { email: tenant.email, password });
}

