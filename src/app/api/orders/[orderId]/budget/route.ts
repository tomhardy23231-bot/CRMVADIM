import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// POST /api/orders/[orderId]/budget - Add budget item
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    const body = await request.json();
    const newItem = await prisma.budgetItem.create({
      data: {
        orderId: orderId,
        name: body.name,
        plan: body.plan || 0,
        fact: body.fact || 0,
        isIncome: body.isIncome || false,
        hasTranches: body.hasTranches || false,
      },
      include: { tranches: true }
    });
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error adding budget item:', error);
    return NextResponse.json({ error: 'Failed to add budget item' }, { status: 500 });
  }
}

// PUT /api/orders/[orderId]/budget - Update budget item
export async function PUT(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    const body = await request.json();
    const updatedItem = await prisma.budgetItem.update({
      where: { id: body.id },
      data: {
        plan: body.plan,
        fact: body.fact,
        hasTranches: body.hasTranches,
      },
    });
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating budget item:', error);
    return NextResponse.json({ error: 'Failed to update budget item' }, { status: 500 });
  }
}

// DELETE /api/orders/[orderId]/budget - Delete budget item
export async function DELETE(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    await prisma.budgetItem.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget item:', error);
    return NextResponse.json({ error: 'Failed to delete budget item' }, { status: 500 });
  }
}
