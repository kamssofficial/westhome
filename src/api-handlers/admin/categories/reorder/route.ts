import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuthRole } from '@/lib/apiAuth';
import { logAdminAction } from "@/lib/audit";
import { memoInvalidateCatalog } from "@/lib/memoCache";

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuthRole(['ADMIN', 'MANAGER']);
  if (authResult.error) return authResult.error;

  try {
    const { categoryIds } = await request.json();

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const updates = categoryIds.map((id: string, index: number) =>
      db.category.update({
        where: { id },
        data: { position: index + 1 },
      })
    );

    await db.$transaction(updates);
    await logAdminAction({ action: "REORDER", entity: "CATEGORY", entityId: null, details: { categoryIds }, request });

    memoInvalidateCatalog();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder categories error:', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
