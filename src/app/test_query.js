require('dotenv').config({ path: 'c:\\Users\\HP\\Desktop\\СРМ ВАДИМА\\.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.order.findFirst({
    where: { name: { contains: 'РЕСКЬЮ 49' } },
    include: { specItems: true }
  });
  if (!order) return;
  console.log("Materia | Cost | Total");
  order.specItems.forEach(s => {
    console.log(`${s.cost.toFixed(2).padStart(10)} | ${s.total.toFixed(2).padStart(10)} | ${s.material}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
