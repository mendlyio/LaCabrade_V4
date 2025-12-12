import crypto from "crypto"

type BpostOptions = {
  publicKey?: string
  privateKey?: string
  webhookSecret?: string
  appId?: string
  apiUrl?: string
  pluginVersion?: string
  platformVersion?: string
}

export default class BpostModuleService {
  private options: BpostOptions
  private static tokenCache: { token: string; expires?: string } | null = null

  constructor({}, options: BpostOptions) {
    this.options = options
  }

  private ensureKeys() {
    if (!this.options.publicKey || !this.options.privateKey) {
      throw new Error("Clés Bpost manquantes (BPOST_PUBLIC_KEY, BPOST_PRIVATE_KEY)")
    }
  }

  private hmacBase64(data: string): string {
    return crypto.createHmac("sha256", this.options.privateKey as string).update(data).digest("base64")
  }

  private authUsername(jsonBody: string): string {
    // Utiliser toujours la publicKey pour l'authentification HMAC
    return this.options.publicKey as string
  }

  private buildHeaders(jsonBody: string): Record<string, string> {
    const username = this.authUsername(jsonBody)
    const password = this.hmacBase64(username + jsonBody)

    const appId =
      this.options.appId ||
      process.env.BPOST_APP_KEY || // permet override via env
      "C6D32390-F48C-3D20-81F8-91932E7E4DE1" // valeur issue du plugin WP

    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      "X-APPID": appId,
    }
  }

  private async sendToApi<T = any>({ method, endpoint, data, headers }: { method: string; endpoint: string; data?: any; headers?: Record<string, string> }): Promise<{ httpCode: number; response: T }> {
    this.ensureKeys()
    // Aligné sur le plugin WP : pluginsapi.bpost.be/v3 (SHM v3)
    // Si l'ENV pointe vers api.bpost.cloud/shm/v3, on force pluginsapi (sinon pickup/shipments échouent)
    const envUrl = process.env.BPOST_API_URL || this.options.apiUrl
    const resolvedBase =
      envUrl && envUrl.includes("api.bpost.cloud")
        ? "https://pluginsapi.bpost.be/v3"
        : envUrl || "https://pluginsapi.bpost.be/v3"
    if (envUrl && envUrl.includes("api.bpost.cloud")) {
      console.warn("[Bpost] BPOST_API_URL redirigé vers pluginsapi.bpost.be/v3 pour compatibilité plugin")
    }
    const baseUrl = resolvedBase
    const url = `${baseUrl.replace(/\/$/, "")}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`
    const body = data ? JSON.stringify(data) : ""
    const baseHeaders = this.buildHeaders(body)

    console.log(`[Bpost] ${method} ${url}`)
    console.log(`[Bpost] Body:`, body || "(empty)")

    const fetchOptions: RequestInit = {
      method,
      headers: { ...baseHeaders, ...(headers || {}) },
    }
    
    // Seulement ajouter body si on a des données et si ce n'est pas GET
    if (body && method !== "GET") {
      fetchOptions.body = body
    }

    const res = await fetch(url, fetchOptions)

    const httpCode = res.status
    let response: any = null
    const responseText = await res.text()
    
    try {
      response = JSON.parse(responseText)
    } catch {
      response = responseText
    }

    console.log(`[Bpost] Réponse ${httpCode}:`, typeof response === 'object' ? JSON.stringify(response).slice(0, 500) : response?.slice?.(0, 500))

    if (!res.ok) {
      const message = (response && (response.Error?.Info || response.error || response.message)) || `Bpost API ${httpCode}`
      console.error(`[Bpost] Erreur ${httpCode}: ${message}`)
      throw new Error(message)
    }
    return { httpCode, response }
  }

  async ping(): Promise<{ ok: boolean }> {
    try {
      // Appel léger: récupérer la liste des transporteurs
      await this.getCarriers()
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }

  async getCarriers(): Promise<any> {
    const { response } = await this.sendToApi({ method: "GET", endpoint: "/carriers" })
    return response
  }

  /**
   * Récupère / rafraîchit un token temporaire (endpoint /keys)
   * Comme dans le plugin WP : Basic auth avec public/private, X-APPID et payload plugin/platform.
   */
  private async ensureToken(): Promise<string> {
    const now = Date.now()
    if (BpostModuleService.tokenCache?.token && BpostModuleService.tokenCache?.expires) {
      const exp = new Date(BpostModuleService.tokenCache.expires).getTime()
      if (exp > now) {
        // injecte le token en tant que publicKey pour les appels suivants
        this.options.publicKey = BpostModuleService.tokenCache.token
        return BpostModuleService.tokenCache.token
      }
    }

    // Envoyer l'URL du STOREFRONT (shop public), pas du backend
    const shopUrl = 
      process.env.BPOST_SHOP_URL || 
      process.env.STOREFRONT_URL || 
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace('backend', 'storefront') ||
      "https://storefront-production-03a4.up.railway.app"
    
    const pluginVersion = this.options.pluginVersion || "3.2.1"
    const platformVersion = this.options.platformVersion || "medusa-2.0"

    console.log(`[Bpost] Appel /keys avec ShopUrl: ${shopUrl}`)

    const body = {
      PluginVersion: pluginVersion,
      ShopUrl: shopUrl,
      PlatformVersion: platformVersion,
    }

    const { response } = await this.sendToApi<any>({
      method: "POST",
      endpoint: "/keys",
      data: body,
    })

    const token = response?.Key || response?.key
    const expire = response?.Expire || response?.expire
    if (!token) {
      throw new Error("Bpost: impossible d'obtenir un token (/keys)")
    }
    BpostModuleService.tokenCache = { token, expires: expire }
    this.options.publicKey = token // utilisé par buildHeaders
    return token
  }

  async listPickupPoints(params: {
    postalCode: string
    country: string
    limit?: number
    offset?: number
    q?: string
    city?: string
    street?: string
  }) {
    const { postalCode, country, city, street } = params
    
    console.log(`[Bpost] Recherche points relais - postalCode: ${postalCode}, country: ${country}, city: ${city}, street: ${street}`)
    
    // Essayer l'API Shipping Manager avec authentification
    try {
      this.ensureKeys()
      await this.ensureToken()
      // Récupérer un CarrierId
      const carriers = await this.getCarriers()
      console.log("[Bpost] Carriers:", JSON.stringify(carriers)?.slice(0, 500))
      const carrierId =
        Array.isArray((carriers as any)?.Carrier) && (carriers as any).Carrier.length > 0
          ? (carriers as any).Carrier[0]?.Id || (carriers as any).Carrier[0]?.id
          : (carriers as any)?.[0]?.Id || (carriers as any)?.[0]?.id
      
      // Fallback city basé sur code postal belge si non fourni
      let cityToUse = city || ""
      if (!cityToUse && country === "BE") {
        const pc = postalCode.substring(0, 2)
        const cityMap: Record<string, string> = {
          "10": "Bruxelles", "11": "Bruxelles", "12": "Bruxelles",
          "20": "Anvers", "30": "Louvain", "40": "Liège", "50": "Namur",
          "60": "Charleroi", "70": "Mons", "80": "Tournai", "90": "Gand"
        }
        cityToUse = cityMap[pc] || "Bruxelles"
      }
      
      const basePayload = {
        Address: {
          City: cityToUse || "Bruxelles",
          Country: country || "BE",
          PostalCode: postalCode,
          Streetname1: street || "Rue de la Station",
        },
        // D'après le plugin WP : pas de CarrierId si non nécessaire, Language fr/nl
        Language: country === "BE" ? "fr" : "en",
      }
      
      console.log(`[Bpost] Appel API Shipping Manager /pickuppoints`)
      
      // Essai 1 : avec CarrierId si disponible
      let attemptPayload = { ...basePayload, ...(carrierId ? { CarrierId: carrierId } : {}) }
      const doCall = async (payload: any) => {
        const { response } = await this.sendToApi<any>({
          method: "POST",
          endpoint: "/pickuppoints",
          data: payload,
        })
        // Parser si c'est une string
        let parsedResponse = response
        if (typeof response === 'string') {
          try {
            // Extraire le JSON avant "Status:" si présent
            const jsonMatch = response.match(/^(\{.*\})(?:Status:|$)/s)
            parsedResponse = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(response)
            console.log(`[Bpost] Response parsée depuis string`)
          } catch (e) {
            console.error(`[Bpost] Impossible de parser response:`, e)
            parsedResponse = {}
          }
        }
        
        console.log(`[Bpost] Type de parsedResponse: ${typeof parsedResponse}`)
        console.log(`[Bpost] parsedResponse.Point existe? ${!!parsedResponse?.Point}, Count: ${parsedResponse?.Count}`)
        
        const rawPoints = parsedResponse?.Point || parsedResponse?.PickupPoint || []
        const points = Array.isArray(rawPoints) ? rawPoints : []
        console.log(`[Bpost] ${points.length} points trouvés`)
        return { points, raw: parsedResponse }
      }

      let result = await doCall(attemptPayload)

      // Si rien trouvé et CarrierId existait, retenter sans CarrierId
      if (!result.points.length && carrierId) {
        console.warn("[Bpost] Aucun point avec CarrierId, nouvel essai sans CarrierId")
        result = await doCall(basePayload)
      }

      if (!result.points.length) {
        return {
          points: [],
          total: 0,
          error: "Bpost n'a renvoyé aucun point. Vérifiez le contrat/credentials ou le code postal.",
          raw: result.raw,
        }
      }

      return { points: result.points, total: result.points.length }
    } catch (e: any) {
      const msg =
        e?.message ||
        (typeof e === "string" ? e : "") ||
        e?.response ||
        e?.stack ||
        JSON.stringify(e) ||
        "Erreur inconnue"
      console.error(`[Bpost] Erreur API:`, msg)
      
      // Retourner une liste vide avec message d'erreur explicite
      return { 
        points: [], 
        total: 0, 
        error: msg || "Service points relais temporairement indisponible. Votre colis sera livré à l'adresse indiquée." 
      }
    }
  }

  async createShipment(input: {
    orderId: string
    recipient: {
      name: string
      email?: string
      phone?: string
      address: { address_1: string; address_2?: string; postal_code: string; city: string; country_code: string }
    }
    pickupPointId?: string
    weightGrams?: number
    reference?: string
  }): Promise<{ shipmentId: string; labelUrl?: string; trackingNumber?: string }> {
    // Schéma simplifié; adapter selon contrat Bpost
    const shipment = {
      ClientReference: input.reference || input.orderId,
      Recipient: {
        Name: input.recipient.name,
        Email: input.recipient.email,
        Phone: input.recipient.phone,
        Address: {
          Streetname1: input.recipient.address.address_1,
          Streetname2: input.recipient.address.address_2 || "",
          PostalCode: input.recipient.address.postal_code,
          City: input.recipient.address.city,
          Country: input.recipient.address.country_code,
        },
      },
      Delivery: input.pickupPointId
        ? { Type: "PICKUP", PickupPointId: input.pickupPointId }
        : { Type: "ADDRESS" },
      Parcel: {
        Weight: Math.max(1, Math.round(input.weightGrams || 1)),
      },
    }

    const { response } = await this.sendToApi<any>({ method: "POST", endpoint: "/shipments", data: { Shipment: [shipment] } })
    // Réponse attendue: identifiants/numéro de suivi
    const created = Array.isArray(response?.Shipment) ? response.Shipment[0] : response?.Shipment || response
    const shipmentId = created?.Id || created?.ShipmentId || input.reference || input.orderId
    const trackingNumber = created?.TrackingNumber || created?.TrackingCode
    return { shipmentId, trackingNumber }
  }

  async getLabel(shipmentId: string): Promise<{ labelUrl: string }> {
    // Étape 1: demande de label
    const { response } = await this.sendToApi<any>({ method: "POST", endpoint: "/labels", data: { ClientReferenceCodeList: [shipmentId], LabelStart: 1, LabelType: 0 } })
    // Selon la plateforme, un callback/url de suivi peut être renvoyé
    const labelUrl = response?.Url || response?.LabelUrl || ""
    return { labelUrl }
  }

  validateWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.options.webhookSecret) {
      console.warn("[Bpost] Webhook secret non configuré, validation impossible")
      return false
    }
    const expectedSignature = crypto.createHmac("sha256", this.options.webhookSecret).update(rawBody).digest("hex")
    return signature === expectedSignature
  }
}


