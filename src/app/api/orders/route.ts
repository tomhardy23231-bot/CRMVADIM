import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// GET /api/orders - Get all orders
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        budgetItems: {
          include: {
            tranches: true,
          },
        },
        specItems: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders - Create a new order (Imported from 1C)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if order already exists by external ID
    const existing = await prisma.order.findFirst({
      where: { externalId: body.id },
    });
    
    if (existing) {
      // Заказ уже есть — синхронизируем только платежи (новые добавляем, старые не дублируем)
      if (body.payments && body.payments.length > 0) {
        const existingPayments = await prisma.payment1C.findMany({ where: { orderId: existing.id } });
        const existingDocs = new Set(existingPayments.map((p: any) => p.document));
        const budgetItems = await prisma.budgetItem.findMany({ where: { orderId: existing.id } });

        const newPayments = body.payments
          .filter((p: any) => !existingDocs.has(p.document || ''))
          .map((p: any) => {
            const matched = budgetItems.find((b: any) =>
              p.article && b.name.toLowerCase() === String(p.article).trim().toLowerCase()
            );
            return {
              orderId: existing.id,
              date: p.date,
              document: p.document,
              article: p.article || '',
              income: p.income || 0,
              expense: p.expense || 0,
              budgetItemId: matched ? matched.id : null,
            };
          });

        if (newPayments.length > 0) {
          await prisma.payment1C.createMany({ data: newPayments });
        }
      }

      const updated = await prisma.order.findUnique({
        where: { id: existing.id },
        include: { budgetItems: { include: { tranches: true } }, specItems: true, payments: true }
      });
      return NextResponse.json(updated, { status: 200 });
    }

    const newOrder = await prisma.order.create({
      data: {
        externalId: body.id,
        name: body.name,
        status: body.status || 'Новый',
        orderAmount: body.orderAmount || 0,
        plannedCost: body.plannedCost || 0,
        deadline: body.deadline,
        productionStart: body.productionStart,
        assemblyStart: body.assemblyStart,
        shippingStart: body.shippingStart,
        budgetItems: {
          create: body.budgetItems?.map((b: any) => ({
            name: b.name,
            plan: b.plan,
            fact: b.fact,
            isIncome: b.isIncome,
            hasTranches: b.hasTranches,
            tranches: {
              create: b.tranches?.map((t: any) => ({
                amount: t.amount,
                month: t.month,
              })),
            },
          })),
        },
        specItems: {
          create: body.specItems?.map((s: any) => ({
            material: s.material,
            unit: s.unit,
            quantity: s.quantity,
            pricePerUnit: s.pricePerUnit,
            total: s.total,
            cost: s.cost,
          })),
        },
      },
      include: {
        budgetItems: { include: { tranches: true } },
        specItems: true,
      },
    });

    // Auto-map 1C payments to Budget Items if there is a name match
    if (body.payments && body.payments.length > 0) {
      const mappedPayments = body.payments.map((p: any) => {
        // Умный поиск: если статья переданная из 1С совпадает с названием плановой статьи
        const matched = newOrder.budgetItems.find((b: any) => 
           (p.article && b.name.toLowerCase() === String(p.article).trim().toLowerCase())
        );

        return {
          orderId: newOrder.id,
          date: p.date,
          document: p.document,
          article: p.article,
          income: p.income,
          expense: p.expense,
          budgetItemId: matched ? matched.id : null,
        };
      });

      await prisma.payment1C.createMany({
        data: mappedPayments
      });
    }

    // Refresh to include newly attached payments
    const completeOrder = await prisma.order.findUnique({
      where: { id: newOrder.id },
      include: {
        budgetItems: { include: { tranches: true } },
        specItems: true,
        payments: true,
      }
    });

    return NextResponse.json(completeOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
