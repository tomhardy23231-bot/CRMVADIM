import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// POST /api/orders/[orderId]/budget/[budgetItemId]/tranches
export async function POST(request: Request, { params }: { params: Promise<{ budgetItemId: string }> }) {
  const { budgetItemId } = await params;
  try {
    const body = await request.json();
    const newTranche = await prisma.tranche.create({
      data: {
        budgetItemId: budgetItemId,
        amount: body.amount || 0,
        month: body.month,
        plannedDate: body.plannedDate || null,
      },
    });
    return NextResponse.json(newTranche, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add tranche' }, { status: 500 });
  }
}

// PUT /api/orders/[orderId]/budget/[budgetItemId]/tranches
export async function PUT(request: Request, context: { params: Promise<{ orderId: string, budgetItemId: string }> }) {
  try {
    const body = await request.json();
    const updateData: any = {};
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.month !== undefined) updateData.month = body.month;
    if (body.plannedDate !== undefined) updateData.plannedDate = body.plannedDate;
    
    const updated = await prisma.tranche.update({
      where: { id: body.id },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tranche' }, { status: 500 });
  }
}

// DELETE /api/orders/[orderId]/budget/[budgetItemId]/tranches
export async function DELETE(request: Request, context: { params: Promise<{ orderId: string, budgetItemId: string }> }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    await prisma.tranche.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete tranche' }, { status: 500 });
  }
}
