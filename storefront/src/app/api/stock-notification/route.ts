import { NextRequest, NextResponse } from 'next/server'

/**
 * API route pour créer une alerte de retour en stock
 * Appelle le backend Medusa
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, variantId, productId: providedProductId } = body

    if (!email || !variantId) {
      return NextResponse.json(
        { error: 'Email et ID de variante requis' },
        { status: 400 }
      )
    }

    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

    // Résoudre le product_id réel via l'API Medusa si non fourni
    let productId = providedProductId
    if (!productId) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (publishableKey) headers['x-publishable-api-key'] = publishableKey

        const variantRes = await fetch(
          `${backendUrl}/store/products?variants[]=${variantId}&fields=id,variants.id`,
          { headers }
        )
        if (variantRes.ok) {
          const variantData = await variantRes.json()
          productId = variantData?.products?.[0]?.id
        }
      } catch {
        // Fallback silencieux
      }
    }

    if (!productId) {
      return NextResponse.json(
        { error: 'Impossible de déterminer le produit associé à cette variante' },
        { status: 400 }
      )
    }

    // Appeler l'API backend
    const storeHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (publishableKey) storeHeaders['x-publishable-api-key'] = publishableKey

    const response = await fetch(`${backendUrl}/store/stock-alerts`, {
      method: 'POST',
      headers: storeHeaders,
      body: JSON.stringify({
        product_id: productId,
        variant_id: variantId,
        email,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Backend error:', errorData)
      
      // Si l'alerte existe déjà, on le considère comme un succès
      if (response.status === 409) {
        return NextResponse.json({ 
          success: true,
          message: 'Alerte déjà enregistrée'
        })
      }
      
      return NextResponse.json(
        { error: errorData.message || 'Erreur lors de la création de l\'alerte' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error in stock notification route:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
