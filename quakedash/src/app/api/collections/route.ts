import { getBatchDb } from '@/app/lib/mongodb';
import { NextResponse } from 'next/server'

export async function GET() {
  const db = await getBatchDb();
  const collections = await db.listCollections().toArray()
  const names = collections.map(c => c.name)
  return NextResponse.json(names)
}