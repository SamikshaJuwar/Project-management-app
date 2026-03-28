const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst();
    console.log("TEST_USER: " + (user ? user.email : "none"));
}
main().catch(console.error).finally(() => prisma.$disconnect());
