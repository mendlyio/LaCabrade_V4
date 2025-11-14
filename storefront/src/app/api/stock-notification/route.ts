import { NextRequest, NextResponse } from 'next/server'

/**
 * API route pour créer une alerte de retour en stock
 * Appelle le backend Medusa
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, variantId, productTitle } = body

    if (!email || !variantId) {
      return NextResponse.json(
        { error: 'Email et ID de variante requis' },
        { status: 400 }
      )
    }

    // Extraire le product_id du variantId si nécessaire
    // Dans Medusa v2, les IDs de variantes commencent souvent par "variant_"
    const productId = variantId.split('_')[0] // Simplification, à adapter selon votre structure

    // Appeler l'API backend
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
    
    const response = await fetch(`${backendUrl}/store/stock-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
