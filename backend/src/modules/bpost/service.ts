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

  private async sendToApi<T = any>({ method, endpoint, data, headers, rawBinary }: { method: string; endpoint: string; data?: any; headers?: Record<string, string>; rawBinary?: boolean }): Promise<{ httpCode: number; response: T; rawBuffer?: Buffer }> {
    this.ensureKeys()
    const envUrl = process.env.BPOST_API_URL || this.options.apiUrl
    const resolvedBase =
      envUrl && envUrl.includes("api.bpost.cloud")
        ? "https://pluginsapi.bpost.be/v3"
        : envUrl || "https://pluginsapi.bpost.be/v3"
    const baseUrl = resolvedBase
    const url = `${baseUrl.replace(/\/$/, "")}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`
    const body = data ? JSON.stringify(data) : ""
    const baseHeaders = this.buildHeaders(body)

    console.log(`[Bpost] ${method} ${url}`)

    const fetchOptions: RequestInit = {
      method,
      headers: { ...baseHeaders, ...(headers || {}) },
    }
    
    if (body && method !== "GET") {
      fetchOptions.body = body
    }

    const res = await fetch(url, fetchOptions)
    const httpCode = res.status
    const contentType = res.headers.get("content-type") || ""

    const isBinaryContentType =
      contentType.includes("application/pdf") ||
      contentType.includes("application/octet-stream") ||
      contentType.includes("application/x-pdf") ||
      contentType.includes("binary/octet-stream")

    if (isBinaryContentType || rawBinary) {
      const arrayBuf = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)

      // Vérifier que c'est bien un PDF (magic bytes %PDF-)
      const isPdf = buffer.length > 5 && buffer.subarray(0, 5).toString("utf-8") === "%PDF-"

      if (isPdf || rawBinary) {
        console.log(`[Bpost] Réponse ${httpCode}: binaire ${isPdf ? "PDF" : "raw"} (${buffer.length} bytes, Content-Type: ${contentType})`)
        if (!res.ok) {
          throw new Error(`Bpost API ${httpCode}`)
        }
        return { httpCode, response: null as any, rawBuffer: buffer }
      }

      // Content-Type binaire mais pas un vrai PDF → traiter comme JSON/texte
      const responseText = buffer.toString("utf-8")
      let response: any = null
      try {
        response = JSON.parse(responseText)
      } catch {
        response = responseText
      }
      console.log(`[Bpost] Réponse ${httpCode} (${contentType} mais pas PDF):`, typeof response === 'object' ? JSON.stringify(response).slice(0, 500) : responseText?.slice?.(0, 500))
      if (!res.ok) {
        const message = (response && (response.Error?.Info || response.error || response.message)) || `Bpost API ${httpCode}`
        throw new Error(message)
      }
      return { httpCode, response }
    }

    // Lire comme texte puis essayer de parser en JSON
    const arrayBuf = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    // Vérifier si c'est un PDF malgré un Content-Type texte/JSON (certains serveurs mal configurés)
    if (buffer.length > 5 && buffer.subarray(0, 5).toString("utf-8") === "%PDF-") {
      console.log(`[Bpost] Réponse ${httpCode}: PDF détecté par magic bytes malgré Content-Type "${contentType}" (${buffer.length} bytes)`)
      if (!res.ok) throw new Error(`Bpost API ${httpCode}`)
      return { httpCode, response: null as any, rawBuffer: buffer }
    }

    const responseText = buffer.toString("utf-8")
    let response: any = null
    try {
      response = JSON.parse(responseText)
    } catch {
      response = responseText
    }

    console.log(`[Bpost] Réponse ${httpCode}:`, typeof response === 'object' ? JSON.stringify(response).slice(0, 500) : responseText?.slice?.(0, 500))

    if (!res.ok) {
      const message = (response && (response.Error?.Info || response.error || response.message)) || `Bpost API ${httpCode}`
      console.error(`[Bpost] Erreur ${httpCode}: ${message}`)
      throw new Error(message)
    }
    return { httpCode, response }
  }

  async ping(): Promise<{ ok: boolean }> {
    try {
      await this.ensureToken()
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
            // Bpost renvoie 2 JSONs séparés par "Status: XXX" : ErrorList puis Point
            // Stratégie : extraire tous les JSONs valides et prendre celui avec "Point"
            const jsonObjects: any[] = [];
            let pos = 0;
            
            while (pos < response.length) {
              const start = response.indexOf('{', pos);
              if (start === -1) break;
              
              // Compter les accolades pour extraire le JSON complet
              let braceCount = 1;
              let end = start + 1;
              while (braceCount > 0 && end < response.length) {
                if (response[end] === '{') braceCount++;
                else if (response[end] === '}') braceCount--;
                end++;
              }
              
              try {
                const jsonStr = response.substring(start, end);
                const parsed = JSON.parse(jsonStr);
                jsonObjects.push(parsed);
                console.log(`[Bpost] JSON extrait (${jsonStr.length} chars, has Point: ${!!parsed.Point})`);
              } catch (e) {
                // JSON invalide, continuer
              }
              
              pos = end;
            }
            
            // Prendre le JSON qui contient "Point"
            const jsonWithPoint = jsonObjects.find(obj => obj.Point);
            if (jsonWithPoint) {
              parsedResponse = jsonWithPoint;
              console.log(`[Bpost] ✅ JSON avec Point trouvé: ${jsonWithPoint.Point?.length || 0} points`);
            } else if (jsonObjects.length > 0) {
              parsedResponse = jsonObjects[0];
              console.log(`[Bpost] ⚠️ Fallback: premier JSON (pas de Point trouvé)`);
            }
          } catch (e) {
            console.error(`[Bpost] Erreur parsing:`, e);
            parsedResponse = {};
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
  }): Promise<{ shipmentId: string; labelUrl?: string; labelData?: string; trackingNumber?: string; clientReference?: string }> {
    await this.ensureToken()

    const clientRef = input.reference || input.orderId
    const countryCode = (input.recipient.address.country_code || "BE").toUpperCase()

    // Structure conforme à la doc Bpost Shipping Manager API v3
    // https://bpostapidev.shiptimize.me/v3/apidocs/usa/endpoints/shipments/POST
    const shipment: Record<string, any> = {
      ClientReference: clientRef,
      Address: {
        Name: input.recipient.name,
        Email: input.recipient.email || "",
        Phone: input.recipient.phone || "",
        Streetname1: input.recipient.address.address_1,
        Streetname2: input.recipient.address.address_2 || "",
        PostalCode: input.recipient.address.postal_code,
        City: input.recipient.address.city,
        Country: countryCode,
      },
      Dimensions: {
        Weight: Math.max(1, Math.round(input.weightGrams || 500)),
      },
    }

    if (input.pickupPointId) {
      shipment.PickupPoint = { Id: input.pickupPointId }
    }

    console.log(`[Bpost] createShipment payload:`, JSON.stringify({ Shipment: [shipment] }).slice(0, 1500))

    const { response, rawBuffer } = await this.sendToApi<any>({
      method: "POST",
      endpoint: "/shipments",
      data: { Shipment: [shipment] },
    })

    console.log(`[Bpost] createShipment full response:`, JSON.stringify(response)?.slice(0, 2000))

    // Vérifier les erreurs globales
    const globalError = this.extractErrorInfo(response)
    if (globalError) {
      console.error(`[Bpost] createShipment ERREUR globale: ${globalError}`)
      throw new Error(`Bpost createShipment: ${globalError}`)
    }

    // PDF binaire direct
    if (rawBuffer && rawBuffer.length > 100) {
      const buf = Buffer.from(rawBuffer)
      if (buf.subarray(0, 5).toString("utf-8") === "%PDF-") {
        const labelData = buf.toString("base64")
        console.log(`[Bpost] createShipment: PDF inline reçu (${buf.length} bytes)`)
        return {
          shipmentId: clientRef,
          clientReference: clientRef,
          labelUrl: `data:application/pdf;base64,${labelData}`,
          labelData,
        }
      }
    }

    // Extraire les infos du shipment créé
    const shipments = Array.isArray(response?.Shipment) ? response.Shipment : []
    const created = shipments[0] || response?.Shipment || {}

    // Vérifier les erreurs par shipment
    const shipmentError = this.extractErrorInfo(created)
    if (shipmentError) {
      console.error(`[Bpost] createShipment ERREUR shipment: ${shipmentError}`)
      throw new Error(`Bpost createShipment: ${shipmentError}`)
    }

    // Warnings (non bloquants)
    const warnings = created?.WarningList
    if (Array.isArray(warnings) && warnings.length > 0) {
      console.warn(`[Bpost] createShipment warnings:`, warnings.map((w: any) => w.Tekst || w.Info || JSON.stringify(w)).join("; "))
    }

    const carrier = created?.CarrierSelect
    const trackingNumber = created?.TrackingNumber || created?.TrackingCode || created?.Barcode || undefined

    console.log(`[Bpost] createShipment OK: carrier=${carrier?.Name || "(auto)"} (id=${carrier?.Id}), tracking=${trackingNumber || "(à venir)"}, ref=${clientRef}`)

    // Le label n'est PAS retourné par POST /shipments — il faut un POST /labels séparé
    return {
      shipmentId: clientRef,
      trackingNumber,
      clientReference: clientRef,
    }
  }

  async getLabel(shipmentId: string, clientReference?: string): Promise<{ labelUrl: string; labelData?: string }> {
    await this.ensureToken()

    const idsToTry = clientReference && clientReference !== shipmentId
      ? [clientReference, shipmentId]
      : [shipmentId]

    const errors: string[] = []

    for (const refId of idsToTry) {
      console.log(`[Bpost] getLabel: lancement création label pour ref "${refId}"`)

      // Stratégie 1 : POST /labels avec ClientReferenceCodeList
      const result = await this.tryPostLabels(refId, errors)
      if (result) return result

      // Stratégie 2 : POST /labels avec OrderReferenceList (alternative Bpost)
      const result2 = await this.tryPostLabelsOrderRef(refId, errors)
      if (result2) return result2
    }

    // Stratégie 3 : POST /labels avec GenerateLabel=true dans le shipment même
    // Certains contrats Bpost renvoient le label inline quand on recrée le shipment
    // On ne re-crée pas ici, mais on tente GET /shipments/{ref}/label
    for (const refId of idsToTry) {
      const result = await this.tryGetLabelDirect(refId, errors)
      if (result) return result
    }

    const errSummary = errors.length > 0 ? ` Détails: ${errors.join(" | ")}` : ""
    console.error(`[Bpost] getLabel: aucune étiquette obtenue (refs: ${idsToTry.join(", ")}).${errSummary}`)
    return { labelUrl: "" }
  }

  private async tryPostLabels(refId: string, errors: string[]): Promise<{ labelUrl: string; labelData?: string } | null> {
    try {
      const { response, rawBuffer } = await this.sendToApi<any>({
        method: "POST",
        endpoint: "/labels",
        data: { ClientReferenceCodeList: [refId], LabelStart: 1, LabelType: 0 },
      })

      const pdfResult = this.handleLabelResponse(response, rawBuffer, refId, "POST /labels (ClientRef)")
      if (pdfResult) return pdfResult

      // Check for CallbackURL and poll
      const callbackUrl = this.findCallbackUrl(response)
      if (callbackUrl) {
        const polled = await this.pollCallbackUrl(callbackUrl, refId, errors)
        if (polled) return polled
      }

      // Log the full response for debugging when nothing found
      console.warn(`[Bpost] POST /labels (ClientRef="${refId}"): ni PDF, ni CallbackURL. Réponse complète:`, JSON.stringify(response)?.slice(0, 2000))
      const errorInfo = this.extractErrorInfo(response)
      if (errorInfo) {
        errors.push(`POST /labels ClientRef "${refId}": ${errorInfo}`)
      } else {
        errors.push(`POST /labels ClientRef "${refId}": pas de PDF ni CallbackURL`)
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      console.warn(`[Bpost] POST /labels (ClientRef) échoué pour ref "${refId}": ${msg}`)
      errors.push(`POST /labels ClientRef "${refId}": ${msg}`)
    }
    return null
  }

  private async tryPostLabelsOrderRef(refId: string, errors: string[]): Promise<{ labelUrl: string; labelData?: string } | null> {
    try {
      // Certains contrats Bpost utilisent OrderReference au lieu de ClientReferenceCodeList
      const { response, rawBuffer } = await this.sendToApi<any>({
        method: "POST",
        endpoint: "/labels",
        data: { OrderReferenceList: [refId], LabelStart: 1, LabelType: 0 },
      })

      const pdfResult = this.handleLabelResponse(response, rawBuffer, refId, "POST /labels (OrderRef)")
      if (pdfResult) return pdfResult

      const callbackUrl = this.findCallbackUrl(response)
      if (callbackUrl) {
        const polled = await this.pollCallbackUrl(callbackUrl, refId, errors)
        if (polled) return polled
      }

      const errorInfo = this.extractErrorInfo(response)
      if (errorInfo) {
        console.warn(`[Bpost] POST /labels (OrderRef="${refId}"): ${errorInfo}`)
      }
    } catch (e: any) {
      // Silencieux — c'est un fallback
      console.log(`[Bpost] POST /labels (OrderRef) échoué pour "${refId}": ${e?.message || e}`)
    }
    return null
  }

  private async tryGetLabelDirect(refId: string, errors: string[]): Promise<{ labelUrl: string; labelData?: string } | null> {
    // Certaines versions de l'API exposent GET /labels/{ref}
    const endpoints = [`/labels/${refId}`, `/shipments/${refId}/label`]
    for (const endpoint of endpoints) {
      try {
        const { response, rawBuffer } = await this.sendToApi<any>({
          method: "GET",
          endpoint,
          rawBinary: true,
        })

        const pdfResult = this.handleLabelResponse(response, rawBuffer, refId, `GET ${endpoint}`)
        if (pdfResult) return pdfResult
      } catch (e: any) {
        // Expected to fail for most endpoints — silencieux
        console.log(`[Bpost] GET ${endpoint} échoué: ${e?.message || e}`)
      }
    }
    return null
  }

  private handleLabelResponse(
    response: any,
    rawBuffer: Buffer | undefined,
    refId: string,
    source: string
  ): { labelUrl: string; labelData?: string } | null {
    // PDF binaire direct
    if (rawBuffer && rawBuffer.length > 100) {
      const buf = Buffer.from(rawBuffer)
      const isPdf = buf.subarray(0, 5).toString("utf-8") === "%PDF-"
      if (isPdf) {
        const labelData = buf.toString("base64")
        console.log(`[Bpost] getLabel(${refId}): PDF obtenu via ${source} (${buf.length} bytes)`)
        return { labelUrl: `data:application/pdf;base64,${labelData}`, labelData }
      }

      // Raw buffer qui n'est pas un PDF — essayer JSON
      const text = buf.toString("utf-8")
      try {
        const parsed = JSON.parse(text)
        const extracted = this.extractPdfFromResponse(parsed)
        if (extracted) {
          console.log(`[Bpost] getLabel(${refId}): PDF extrait du JSON via ${source}`)
          return extracted
        }
      } catch {}
    }

    // Réponse JSON directe
    const extracted = this.extractPdfFromResponse(response)
    if (extracted) {
      console.log(`[Bpost] getLabel(${refId}): PDF extrait de la réponse via ${source}`)
      return extracted
    }

    return null
  }

  private findCallbackUrl(response: any): string | null {
    if (!response || typeof response !== "object") return null
    return response.CallbackURL || response.CallbackUrl
      || response.callbackUrl || response.callbackURL
      || response.Callback || response.callback
      || null
  }

  private extractErrorInfo(response: any): string | null {
    if (!response || typeof response !== "object") return null

    // Bpost always returns Error { Id, Info } — Id=0 + empty Info means NO error
    const error = response.Error || response.error
    if (error && typeof error === "object") {
      const id = error.Id ?? error.id
      const info = error.Info || error.Message || error.message || ""
      if (id === 0 && !info) return null
      if (info) return info
    } else if (error && typeof error === "string" && error.trim()) {
      return error
    }

    const errorList = response.ErrorList || response.errorList || response.Errors || response.errors
    if (Array.isArray(errorList) && errorList.length > 0) {
      const messages = errorList
        .filter((e: any) => {
          const id = e.Id ?? e.id
          const text = e.Tekst || e.Info || e.Message || e.message || e.info || ""
          return !(id === 0 && !text)
        })
        .map((e: any) => e.Tekst || e.Info || e.Message || e.message || e.info || JSON.stringify(e))
      return messages.length > 0 ? messages.join("; ") : null
    }

    return null
  }

  private async pollCallbackUrl(
    callbackUrl: string,
    refId: string,
    errors: string[]
  ): Promise<{ labelUrl: string; labelData?: string } | null> {
    console.log(`[Bpost] getLabel: polling ${callbackUrl}`)
    const maxAttempts = 15
    const delayMs = 2000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, delayMs))

      try {
        const endpoint = callbackUrl.includes("/v3/")
          ? callbackUrl.substring(callbackUrl.indexOf("/v3/") + 3)
          : callbackUrl.startsWith("/") ? callbackUrl : `/${callbackUrl}`

        const { response, rawBuffer } = await this.sendToApi<any>({
          method: "GET",
          endpoint,
          rawBinary: true,
        })

        const pdfResult = this.handleLabelResponse(response, rawBuffer, refId, `poll #${attempt}`)
        if (pdfResult) return pdfResult

        // Pas un PDF → essayer de parser pour statut
        if (rawBuffer && rawBuffer.length > 0) {
          const text = Buffer.from(rawBuffer).toString("utf-8")
          let parsed: any = null
          try { parsed = JSON.parse(text) } catch { parsed = text }

          const errorInfo = typeof parsed === "object" ? this.extractErrorInfo(parsed) : null
          if (errorInfo && !errorInfo.toLowerCase().includes("pending") && !errorInfo.toLowerCase().includes("processing")) {
            console.error(`[Bpost] getLabel(${refId}): erreur au poll #${attempt}: ${errorInfo}`)
            errors.push(`Poll #${attempt}: ${errorInfo}`)
            break
          }

          const status = parsed?.Status || parsed?.status
          console.log(`[Bpost] getLabel(${refId}): poll #${attempt}/${maxAttempts} — pas encore prêt (status: ${status || "unknown"})`)
        } else {
          console.log(`[Bpost] getLabel(${refId}): poll #${attempt}/${maxAttempts} — aucune donnée`)
        }
      } catch (e: any) {
        console.warn(`[Bpost] getLabel poll #${attempt} erreur: ${e?.message}`)
      }
    }

    console.warn(`[Bpost] getLabel(${refId}): timeout après ${maxAttempts} tentatives de polling`)
    errors.push(`Timeout polling pour ref "${refId}" après ${maxAttempts} tentatives`)
    return null
  }

  private extractPdfFromResponse(response: any): { labelUrl: string; labelData: string } | null {
    if (!response) return null

    // String qui est un PDF brut
    if (typeof response === "string") {
      if (response.startsWith("%PDF")) {
        const labelData = Buffer.from(response, "binary").toString("base64")
        return { labelUrl: `data:application/pdf;base64,${labelData}`, labelData }
      }
      // String base64 qui décode en PDF
      if (response.length > 200 && !response.startsWith("{") && !response.startsWith("<")) {
        try {
          const decoded = Buffer.from(response, "base64")
          if (decoded.subarray(0, 5).toString("utf-8") === "%PDF-") {
            return { labelUrl: `data:application/pdf;base64,${response}`, labelData: response }
          }
        } catch {}
      }
      return null
    }

    if (typeof response !== "object") return null

    // JSON structuré: Label[].LabelData, ou LabelData direct
    const labelArray = Array.isArray(response.Label) ? response.Label : []
    const firstLabel = labelArray[0] || {}

    const labelData =
      firstLabel.LabelData || firstLabel.labelData ||
      response.LabelData || response.labelData ||
      response.labels?.[0]?.data || ""

    if (labelData && typeof labelData === "string" && labelData.length > 100) {
      const directUrl = response.Url || response.LabelUrl || firstLabel.Url || ""
      return {
        labelUrl: directUrl || `data:application/pdf;base64,${labelData}`,
        labelData,
      }
    }

    const directUrl = response.Url || response.LabelUrl || firstLabel.Url || firstLabel.url || ""
    if (directUrl) {
      return { labelUrl: directUrl, labelData: "" }
    }

    return null
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


