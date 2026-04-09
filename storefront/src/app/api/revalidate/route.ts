import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/revalidate
 * Invalide le cache Next.js des produits.
 * Appelé par le job Medusa après chaque sync de stock ou de prix.
 *
 * Body: { secret: string, tags?: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { secret, tags } = await req.json()

    if (secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tagsToRevalidate = tags?.length ? tags : ["products"]

    for (const tag of tagsToRevalidate) {
      revalidateTag(tag)
    }

    return NextResponse.json({ revalidated: true, tags: tagsToRevalidate })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
