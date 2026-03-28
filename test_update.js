const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const project = await prisma.project.findFirst();
    if(project) {
        await prisma.project.update({
            where: { id: project.id },
            data: { startDate: new Date() }
        });
        console.log("Updated");
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
