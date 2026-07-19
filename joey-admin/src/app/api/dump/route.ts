import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export async function GET() {
  const products = await dataStore.getProducts();
  return NextResponse.json(products);
}
