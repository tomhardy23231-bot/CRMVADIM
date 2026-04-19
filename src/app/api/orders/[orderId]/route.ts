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

// PUT /api/orders/[orderId] - Partial update (only fields sent in body are updated)
export async function PUT(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    const body = await request.json();

    // Build data object dynamically — only include fields present in the request
    const data: Record<string, unknown> = {};

    if (body.status !== undefined)             data.status = body.status;
    if (body.isArchived !== undefined)         data.isArchived = body.isArchived;
    if (body.deadline !== undefined)           data.deadline = body.deadline;
    if (body.productionStart !== undefined)    data.productionStart = body.productionStart;
    if (body.assemblyStart !== undefined)      data.assemblyStart = body.assemblyStart;
    if (body.shippingStart !== undefined)      data.shippingStart = body.shippingStart;
    if (body.isProductionStarted !== undefined) data.isProductionStarted = body.isProductionStarted;
    if (body.isAssemblyStarted !== undefined)  data.isAssemblyStarted = body.isAssemblyStarted;
    if (body.isShipped !== undefined)          data.isShipped = body.isShipped;
    if (body.orderAmount !== undefined)        data.orderAmount = body.orderAmount;
    if (body.isAmountManual !== undefined)     data.isAmountManual = body.isAmountManual;
    if (body.expectedPaymentDate !== undefined) data.expectedPaymentDate = body.expectedPaymentDate;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data,
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
