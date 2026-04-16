import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// GET /api/orders/[orderId]
export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        budgetItems: { include: { tranches: true } },
        specItems: true,
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PUT /api/orders/[orderId] - Update order details
export async function PUT(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    const body = await request.json();

    // Partial update of the order 
    // We only update top-level fields for now
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: body.status,
        deadline: body.deadline,
        productionStart: body.productionStart,
        assemblyStart: body.assemblyStart,
        shippingStart: body.shippingStart,
        isProductionStarted: body.isProductionStarted,
        isAssemblyStarted: body.isAssemblyStarted,
        isShipped: body.isShipped,
        orderAmount: body.orderAmount,
        isAmountManual: body.isAmountManual,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

// DELETE /api/orders/[orderId]
export async function DELETE(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    await prisma.order.delete({
      where: { id: orderId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
