import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/data/products';
import crypto from 'node:crypto';

/**
 * Para habilitar la seguridad, configura la variable de entorno CATALOG_API_KEY.
 * Si no está configurada, el endpoint permanecerá público (o puedes cambiar este comportamiento).
 */
const API_KEY = process.env.CATALOG_API_KEY;

export async function GET(request: NextRequest) {
  // Si la API Key está configurada, validamos la petición
  if (API_KEY) {
    const apiKeyHeader = request.headers.get('x-api-key');
    const apiKeyQuery = request.nextUrl.searchParams.get('apiKey');
    const providedKey = apiKeyHeader || apiKeyQuery;

    if (!providedKey) {
      return NextResponse.json({ message: 'API Key is missing' }, { status: 401 });
    }

    // Validación segura contra ataques de tiempo
    const a = Buffer.from(providedKey);
    const b = Buffer.from(API_KEY);
    
    const isValid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!isValid) {
      return NextResponse.json({ message: 'Invalid API Key' }, { status: 403 });
    }
  }

  try {
    const products = await getAllProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ message: 'Error fetching products' }, { status: 500 });
  }
}
