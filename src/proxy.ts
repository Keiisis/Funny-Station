import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/middleware'

// Next.js 16 : l'ancien `middleware` est renommé `proxy` (même fonctionnement).
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Toutes les routes SAUF :
     * - _next/static, _next/image (assets)
     * - favicon, fichiers images/médias publics
     * Les routes de jeux locales (/games/*) sont servies statiquement et exclues.
     */
    '/((?!_next/static|_next/image|favicon.ico|games/|videos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4|webm|ogg|wasm|jar)$).*)',
  ],
}
