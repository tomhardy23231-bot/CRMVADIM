import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// PUT /api/orders/[orderId]/payments/[paymentId]
export async function PUT(request: Request, { params }: { params: Promise<{ orderId: string, paymentId: string }> }) {
  const { paymentId } = await params;
  
  try {
    const body = await request.json();
    
    const updated = await prisma.payment1C.update({
      where: { id: paymentId },
      data: {
        budgetItemId: body.budgetItemId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
