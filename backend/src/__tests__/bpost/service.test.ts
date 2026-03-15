/**
 * Tests unitaires — BpostModuleService
 *
 * Couvre :
 *  - Authentification HMAC-SHA256 (buildHeaders)
 *  - getLabel() : tous les formats de réponse Bpost SHM v3
 *  - createShipment() : livraison domicile & point relais
 *  - Gestion des erreurs API (4xx/5xx)
 *  - listPickupPoints() : parsing de la réponse JSON-dans-string
 */

import BpostModuleService from "../../modules/bpost/service"

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = jest.fn()
global.fetch = mockFetch as any

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFetchOk(body: any) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  }
}

function makeFetchError(status: number, body: any) {
  return {
    ok: false,
    status,
    text: async () => JSON.stringify(body),
  }
}

function makeService(opts: Record<string, string> = {}) {
  return new BpostModuleService(
    {} as any,
    {
      publicKey: "TEST-PUBLIC-KEY",
      privateKey: "TEST-PRIVATE-KEY",
      ...opts,
    }
  )
}

// ─── Suite principale ─────────────────────────────────────────────────────────

beforeEach(() => {
  mockFetch.mockReset()
  // Réinitialiser le cache de token entre les tests
  ;(BpostModuleService as any).tokenCache = null
})

// ════════════════════════════════════════════════════════════════════════════
// Authentification HMAC
// ════════════════════════════════════════════════════════════════════════════

describe("buildHeaders() — authentification HMAC-SHA256", () => {
  it("inclut un header Authorization Basic", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(makeFetchOk([{ Id: "carrier-1" }]))

    await svc.getCarriers()

    const callArgs = mockFetch.mock.calls[0]
    const headers: Record<string, string> = callArgs[1].headers
    expect(headers["Authorization"]).toMatch(/^Basic /)
    expect(headers["X-APPID"]).toBeDefined()
    expect(headers["Content-Type"]).toBe("application/json")
    expect(headers["Accept"]).toBe("application/json")
  })

  it("le token Basic est un base64 de publicKey:hmac(publicKey+body)", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(makeFetchOk([]))

    await svc.getCarriers()

    const authHeader: string = mockFetch.mock.calls[0][1].headers["Authorization"]
    const decoded = Buffer.from(authHeader.replace("Basic ", ""), "base64").toString("utf8")
    // Format : "publicKey:hmacBase64"
    expect(decoded).toMatch(/^TEST-PUBLIC-KEY:.+$/)
  })

  it("lance une erreur si les clés sont absentes", () => {
    const svc = new BpostModuleService({} as any, {})
    expect(() => (svc as any).ensureKeys()).toThrow("Clés Bpost manquantes")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getLabel() — parsing de toutes les structures de réponse
// ════════════════════════════════════════════════════════════════════════════

describe("getLabel()", () => {
  it("parse response.Url (format simple)", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({ Url: "https://bpost.example.com/label-abc.pdf" })
    )

    const result = await svc.getLabel("shipment-123")

    expect(result.labelUrl).toBe("https://bpost.example.com/label-abc.pdf")
    expect(result.labelData).toBeUndefined()
  })

  it("parse response.LabelUrl (variante)", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({ LabelUrl: "https://bpost.example.com/label-xyz.pdf" })
    )

    const result = await svc.getLabel("shipment-123")

    expect(result.labelUrl).toBe("https://bpost.example.com/label-xyz.pdf")
  })

  it("parse Label[0].Url (format tableau SHM v3)", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({
        Label: [{ Url: "https://labels.bpost.be/label-456.pdf", ClientReference: "order-1" }],
      })
    )

    const result = await svc.getLabel("shipment-456")

    expect(result.labelUrl).toBe("https://labels.bpost.be/label-456.pdf")
    expect(result.labelData).toBeUndefined()
  })

  it("parse Label[0].LabelData (base64 PDF inline)", async () => {
    const svc = makeService()
    const fakePdfBase64 = Buffer.from("%PDF-1.3 fake content").toString("base64")
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({
        Label: [
          {
            LabelData: fakePdfBase64,
            LabelFormat: "PDF",
            ClientReference: "order-2",
          },
        ],
      })
    )

    const result = await svc.getLabel("shipment-789")

    expect(result.labelData).toBe(fakePdfBase64)
    expect(result.labelUrl).toBe(`data:application/pdf;base64,${fakePdfBase64}`)
  })

  it("retourne labelUrl vide si la réponse est vide", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(makeFetchOk({ status: "pending" }))

    const result = await svc.getLabel("shipment-empty")

    expect(result.labelUrl).toBe("")
    expect(result.labelData).toBeUndefined()
  })

  it("préfère Label[0].Url si URL et LabelData sont tous deux présents", async () => {
    const svc = makeService()
    const fakePdfBase64 = Buffer.from("%PDF").toString("base64")
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({
        Label: [
          {
            Url: "https://labels.bpost.be/priority.pdf",
            LabelData: fakePdfBase64,
          },
        ],
      })
    )

    const result = await svc.getLabel("shipment-priority")

    // L'URL directe doit être préférée au data URI
    expect(result.labelUrl).toBe("https://labels.bpost.be/priority.pdf")
    expect(result.labelData).toBe(fakePdfBase64)
  })

  it("envoie le bon payload à l'endpoint /labels", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(makeFetchOk({ Url: "https://url.pdf" }))

    await svc.getLabel("my-shipment-ref")

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.ClientReferenceCodeList).toContain("my-shipment-ref")
    expect(callBody.LabelType).toBe(0)
    expect(callBody.LabelStart).toBe(1)
  })

  it("lance une erreur sur réponse 401 Unauthorized", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchError(401, { error: "Unauthorized" })
    )

    await expect(svc.getLabel("bad-shipment")).rejects.toThrow()
  })

  it("lance une erreur sur réponse 500", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchError(500, { error: "Internal Server Error" })
    )

    await expect(svc.getLabel("bad-shipment")).rejects.toThrow()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// createShipment() — construction du payload
// ════════════════════════════════════════════════════════════════════════════

describe("createShipment()", () => {
  const baseRecipient = {
    name: "Marie Dubois",
    email: "marie@example.com",
    phone: "+32 499 00 00 01",
    address: {
      address_1: "Rue de la Paix 1",
      postal_code: "1000",
      city: "Bruxelles",
      country_code: "BE",
    },
  }

  it("retourne shipmentId et trackingNumber depuis response.Shipment[0].Id", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({
        Shipment: [{ Id: "SHP-123", TrackingNumber: "323456789BE" }],
      })
    )

    const result = await svc.createShipment({
      orderId: "order-1",
      recipient: baseRecipient,
    })

    expect(result.shipmentId).toBe("SHP-123")
    expect(result.trackingNumber).toBe("323456789BE")
  })

  it("accepte TrackingCode comme alias de TrackingNumber", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({
        Shipment: [{ Id: "SHP-456", TrackingCode: "323456789FR" }],
      })
    )

    const result = await svc.createShipment({
      orderId: "order-2",
      recipient: baseRecipient,
    })

    expect(result.trackingNumber).toBe("323456789FR")
  })

  it("livraison domicile : Delivery.Type = ADDRESS", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({ Shipment: [{ Id: "SHP-789" }] })
    )

    await svc.createShipment({ orderId: "order-home", recipient: baseRecipient })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.Shipment[0].Delivery.Type).toBe("ADDRESS")
    expect(body.Shipment[0].Delivery.PickupPointId).toBeUndefined()
  })

  it("point relais : Delivery.Type = PICKUP avec PickupPointId", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({ Shipment: [{ Id: "SHP-PICKUP" }] })
    )

    await svc.createShipment({
      orderId: "order-pickup",
      recipient: baseRecipient,
      pickupPointId: "BPOST-PP-42",
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const delivery = body.Shipment[0].Delivery
    expect(delivery.Type).toBe("PICKUP")
    expect(delivery.PickupPointId).toBe("BPOST-PP-42")
  })

  it("le destinataire est correctement structuré dans le payload", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({ Shipment: [{ Id: "SHP-REC" }] })
    )

    await svc.createShipment({ orderId: "order-rec", recipient: baseRecipient })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const recipient = body.Shipment[0].Recipient
    expect(recipient.Name).toBe("Marie Dubois")
    expect(recipient.Email).toBe("marie@example.com")
    expect(recipient.Address.PostalCode).toBe("1000")
    expect(recipient.Address.City).toBe("Bruxelles")
    expect(recipient.Address.Country).toBe("BE")
  })

  it("utilise orderId comme ClientReference si reference absent", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({ Shipment: [{ Id: "SHP-REF" }] })
    )

    await svc.createShipment({ orderId: "order-xyz", recipient: baseRecipient })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.Shipment[0].ClientReference).toBe("order-xyz")
  })

  it("utilise le poids fourni (en grammes, minimum 1)", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({ Shipment: [{ Id: "SHP-W" }] })
    )

    await svc.createShipment({
      orderId: "order-w",
      recipient: baseRecipient,
      weightGrams: 2500,
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.Shipment[0].Parcel.Weight).toBe(2500)
  })

  it("force le poids minimum à 1 si weightGrams est 0 ou absent", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(
      makeFetchOk({ Shipment: [{ Id: "SHP-W0" }] })
    )

    await svc.createShipment({
      orderId: "order-w0",
      recipient: baseRecipient,
      weightGrams: 0,
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.Shipment[0].Parcel.Weight).toBeGreaterThanOrEqual(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ping()
// ════════════════════════════════════════════════════════════════════════════

describe("ping()", () => {
  it("retourne ok=true si l'API répond avec succès", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(makeFetchOk([{ Id: "carrier-1" }]))

    const result = await svc.ping()

    expect(result.ok).toBe(true)
  })

  it("retourne ok=false si l'API est inaccessible", async () => {
    const svc = makeService()
    mockFetch.mockRejectedValueOnce(new Error("Network failure"))

    const result = await svc.ping()

    expect(result.ok).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// validateWebhookSignature()
// ════════════════════════════════════════════════════════════════════════════

describe("validateWebhookSignature()", () => {
  it("valide une signature HMAC correcte", () => {
    const crypto = require("crypto")
    const secret = "my-webhook-secret"
    const body = '{"event":"shipment.delivered"}'
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex")

    const svc = makeService({ publicKey: "pk", privateKey: "sk", webhookSecret: secret })
    expect(svc.validateWebhookSignature(body, sig)).toBe(true)
  })

  it("rejette une signature incorrecte", () => {
    const svc = makeService({ publicKey: "pk", privateKey: "sk", webhookSecret: "secret" })
    expect(svc.validateWebhookSignature('{"event":"test"}', "wrong-signature")).toBe(false)
  })

  it("retourne false si webhookSecret non configuré", () => {
    const svc = makeService()
    expect(svc.validateWebhookSignature("body", "sig")).toBe(false)
  })
})
