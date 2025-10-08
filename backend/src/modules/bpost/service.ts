import crypto from "crypto"

type BpostOptions = {
  publicKey?: string
  privateKey?: string
  webhookSecret?: string
}

export default class BpostModuleService {
  private options: BpostOptions

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

    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    }
  }

  private async sendToApi<T = any>({ method, endpoint, data, headers }: { method: string; endpoint: string; data?: any; headers?: Record<string, string> }): Promise<{ httpCode: number; response: T }> {
    this.ensureKeys()
    const baseUrl = process.env.BPOST_API_URL || "https://api.bpost.cloud/shm/v3"
    const url = `${baseUrl.replace(/\/$/, "")}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`
    const body = data ? JSON.stringify(data) : ""
    const baseHeaders = this.buildHeaders(body)

    console.log(`[Bpost] ${method} ${url}`)

    const res = await fetch(url, {
      method,
      headers: { ...baseHeaders, ...(headers || {}) },
      body: body || undefined,
    })

    const httpCode = res.status
    let response: any = null
    try {
      response = await res.json()
    } catch {
      response = null
    }

    if (!res.ok) {
      const message = (response && (response.Error?.Info || response.message)) || `Bpost API ${httpCode}`
      console.error(`[Bpost] Erreur ${httpCode}: ${message}`, response)
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

  async listPickupPoints(params: { postalCode: string; country: string; limit?: number; offset?: number; q?: string }) {
    // Le v3 attend une adresse; CarrierId peut être optionnel selon contrat
    const { postalCode, country } = params
    const payload = {
      Address: {
        City: "",
        Country: country || "BE",
        PostalCode: postalCode,
        Streetname1: "",
        Lat: "",
        Long: "",
      },
      // Language: fr|nl basé sur country/localisation
      Language: country === "BE" ? "fr" : "en",
    }

    const { response } = await this.sendToApi<{ PickupPoint?: any[]; total?: number }>({ method: "POST", endpoint: "/pickuppoints", data: payload })
    const points = (response as any)?.PickupPoint || response || []
    // La pagination serveur n’est pas garantie; appliquer côté client si besoin
    return { points, total: Array.isArray(points) ? points.length : 0 }
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


