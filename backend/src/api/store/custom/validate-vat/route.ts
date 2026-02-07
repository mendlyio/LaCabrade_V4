import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

/**
 * POST /store/custom/validate-vat
 * 
 * Valide un numéro de TVA intracommunautaire via le service VIES de la Commission Européenne.
 * Retourne les informations de l'entreprise si le numéro est valide.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { vat_number } = req.body as { vat_number?: string }

    if (!vat_number || vat_number.length < 4) {
      return res.status(400).json({
        valid: false,
        message: "Numéro de TVA trop court. Format attendu: code pays + numéro (ex: BE0123456789)",
      })
    }

    // Extraire le code pays (2 premières lettres) et le numéro
    const cleaned = vat_number.replace(/[\s\-.]/g, "").toUpperCase()
    const countryCode = cleaned.substring(0, 2)
    const vatNum = cleaned.substring(2)

    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return res.status(400).json({
        valid: false,
        message: "Le numéro de TVA doit commencer par un code pays de 2 lettres (ex: BE, FR, DE)",
      })
    }

    if (!vatNum || vatNum.length < 2) {
      return res.status(400).json({
        valid: false,
        message: "Numéro de TVA incomplet après le code pays",
      })
    }

    // Liste des pays EU supportés par VIES
    const euCountries = [
      "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
      "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
      "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI" // XI = Northern Ireland
    ]

    if (!euCountries.includes(countryCode)) {
      return res.status(400).json({
        valid: false,
        message: `Le code pays "${countryCode}" n'est pas un pays membre de l'UE`,
      })
    }

    // Appeler l'API VIES (REST endpoint)
    const viesUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryCode}/vat/${vatNum}`
    
    const viesResponse = await fetch(viesUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "LaCabrade-Storefront/1.0",
      },
      signal: AbortSignal.timeout(10000), // 10 secondes timeout
    })

    if (!viesResponse.ok) {
      // Fallback: essayer l'ancien endpoint SOAP-like
      const fallbackUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`
      const fallbackRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "LaCabrade-Storefront/1.0",
        },
        body: JSON.stringify({
          countryCode: countryCode,
          vatNumber: vatNum,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (!fallbackRes.ok) {
        console.error("[ValidateVAT] VIES API error:", await fallbackRes.text())
        return res.status(502).json({
          valid: false,
          message: "Le service VIES est temporairement indisponible. Réessayez dans quelques instants.",
        })
      }

      const fallbackData = await fallbackRes.json()
      
      if (fallbackData.valid) {
        console.log(`[ValidateVAT] ✅ VAT ${cleaned} valide — ${fallbackData.name || "N/A"}`)
        return res.json({
          valid: true,
          vat_number: cleaned,
          country_code: countryCode,
          company_name: fallbackData.name && fallbackData.name !== "---" ? fallbackData.name.trim() : null,
          company_address: fallbackData.address && fallbackData.address !== "---" ? fallbackData.address.trim() : null,
        })
      } else {
        console.log(`[ValidateVAT] ❌ VAT ${cleaned} invalide`)
        return res.json({
          valid: false,
          message: "Ce numéro de TVA n'est pas enregistré dans VIES",
        })
      }
    }

    const viesData = await viesResponse.json()

    if (viesData.isValid || viesData.valid) {
      console.log(`[ValidateVAT] ✅ VAT ${cleaned} valide — ${viesData.name || viesData.traderName || "N/A"}`)
      return res.json({
        valid: true,
        vat_number: cleaned,
        country_code: countryCode,
        company_name: (viesData.name || viesData.traderName || "").trim() || null,
        company_address: (viesData.address || viesData.traderAddress || "").trim() || null,
      })
    } else {
      console.log(`[ValidateVAT] ❌ VAT ${cleaned} invalide`)
      return res.json({
        valid: false,
        message: "Ce numéro de TVA n'est pas enregistré dans le système VIES de l'UE",
      })
    }
  } catch (error: any) {
    console.error("[ValidateVAT] Error:", error.message)

    // Si c'est un timeout, message spécifique
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({
        valid: false,
        message: "Le service VIES ne répond pas. Réessayez dans quelques instants.",
      })
    }

    return res.status(500).json({
      valid: false,
      message: "Erreur lors de la validation. Réessayez.",
    })
  }
}
