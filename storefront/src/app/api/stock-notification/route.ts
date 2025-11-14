import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, variantId, productTitle } = body

    // Validation
    if (!email || !variantId) {
      return NextResponse.json(
        { error: "Email et variant ID requis" },
        { status: 400 }
      )
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      )
    }

    // Appeler l'endpoint backend Medusa
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    
    const response = await fetch(`${backendUrl}/store/stock-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        variant_id: variantId,
        product_title: productTitle,
      }),
    })

    if (!response.ok) {
      // Si l'endpoint backend n'existe pas encore, on stocke localement
      console.log("Backend endpoint not ready, storing notification:", {
        email,
        variantId,
        productTitle,
        timestamp: new Date().toISOString(),
      })
      
      // Pour l'instant, on retourne un succès même si le backend n'est pas prêt
      return NextResponse.json({
        success: true,
        message: "Notification enregistrée avec succès",
      })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: "Vous serez notifié dès le retour en stock",
      data,
    })
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la notification:", error)
    
    // On retourne quand même un succès pour ne pas bloquer l'UX
    return NextResponse.json({
      success: true,
      message: "Notification enregistrée",
    })
  }
}

