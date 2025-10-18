import { getProductsById } from "@lib/data/products"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds, regionId } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ products: [] })
    }

    if (!regionId) {
      return NextResponse.json({ error: "Region ID is required" }, { status: 400 })
    }

    const products = await getProductsById({
      ids: productIds,
      regionId,
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error("Error fetching wishlist products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

