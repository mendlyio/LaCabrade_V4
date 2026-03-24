/**
 * Tests unitaires — BpostModuleService
 *
 * Couvre :
 *  - Authentification HMAC-SHA256 (buildHeaders)
 *  - extractErrorInfo() : Error.Id=0 ne doit PAS être une erreur
 *  - createShipment() : structure conforme à l'API v3 (Address/Dimensions/PickupPoint)
 *  - getLabel() : tous les formats de réponse Bpost SHM v3
 *  - Gestion des erreurs API (4xx/5xx)
 *  - validateWebhookSignature()
 */

import BpostModuleService from "../../modules/bpost/service"

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = jest.fn()
global.fetch = mockFetch as any

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retourne un ArrayBuffer propre depuis un Buffer Node.js.
 * Buffer.prototype.buffer peut pointer vers un ArrayBuffer partagé
 * (byteOffset > 0), ce qui corrompt Buffer.from(arrayBuf) côté sendToApi.
 */
function bufferToCleanArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength)
  const view = new Uint8Array(ab)
  buf.copy(Buffer.from(ab))
  // Copier octet par octet pour éviter les problèmes d'offset
  for (let i = 0; i < buf.byteLength; i++) view[i] = buf[i]
  return ab
}

function makeJsonResponse(body: any, status = 200) {
  const buf = Buffer.from(JSON.stringify(body), "utf-8")
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (_: string) => "application/json" },
    arrayBuffer: async () => bufferToCleanArrayBuffer(buf),
  }
}

function makePdfResponse(pdfBytes: Buffer) {
  return {
    ok: true,
    status: 200,
    headers: { get: (_: string) => "application/pdf" },
    arrayBuffer: async () => bufferToCleanArrayBuffer(pdfBytes),
  }
}

/** Réponse Bpost standard : Error.Id=0 + Info="" = pas d'erreur */
function bpostOk(extra: Record<string, any> = {}) {
  return { Error: { Id: 0, Info: "" }, ...extra }
}

function makeService(opts: Record<string, string> = {}) {
  return new BpostModuleService({} as any, {
    publicKey: "TEST-PUBLIC-KEY",
    privateKey: "TEST-PRIVATE-KEY",
    ...opts,
  })
}

/** Faux PDF > 100 bytes avec magic bytes valides */
function fakePdfBuffer(extra = "fake pdf data for testing bpost label endpoint"): Buffer {
  const header = "%PDF-1.4\n"
  const pad = "x".repeat(Math.max(0, 110 - header.length - extra.length))
  return Buffer.from(header + extra + pad, "utf-8")
}

// ─── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockFetch.mockReset()
  ;(BpostModuleService as any).tokenCache = null
  jest.useRealTimers()
})

// ════════════════════════════════════════════════════════════════════════════
// Authentification HMAC
// ════════════════════════════════════════════════════════════════════════════

describe("buildHeaders() — authentification HMAC-SHA256", () => {
  it("inclut Authorization Basic, X-APPID, Content-Type", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(makeJsonResponse([{ Id: "c1" }]))

    await svc.getCarriers()

    const headers: Record<string, string> = mockFetch.mock.calls[0][1].headers
    expect(headers["Authorization"]).toMatch(/^Basic /)
    expect(headers["X-APPID"]).toBeDefined()
    expect(headers["Content-Type"]).toBe("application/json")
    expect(headers["Accept"]).toBe("application/json")
  })

  it("le token Basic est publicKey:hmac(publicKey+body)", async () => {
    const svc = makeService()
    mockFetch.mockResolvedValueOnce(makeJsonResponse([]))

    await svc.getCarriers()

    const authHeader: string = mockFetch.mock.calls[0][1].headers["Authorization"]
    const decoded = Buffer.from(authHeader.replace("Basic ", ""), "base64").toString("utf8")
    expect(decoded).toMatch(/^TEST-PUBLIC-KEY:.+$/)
  })

  it("lance une erreur si les clés sont absentes", () => {
    const svc = new BpostModuleService({} as any, {})
    expect(() => (svc as any).ensureKeys()).toThrow("Clés Bpost manquantes")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// extractErrorInfo() — Error.Id=0 ne doit PAS lever d'erreur
// ════════════════════════════════════════════════════════════════════════════

describe("extractErrorInfo() — comportement Bpost (Error toujours présent)", () => {
  let svc: BpostModuleService

  beforeEach(() => { svc = makeService() })

  it("Error.Id=0 + Info='' → null (pas d'erreur)", () => {
    expect((svc as any).extractErrorInfo({ Error: { Id: 0, Info: "" } })).toBeNull()
  })

  it("Error.Id=0 + Info='' (minuscules) → null", () => {
    expect((svc as any).extractErrorInfo({ error: { id: 0, info: "" } })).toBeNull()
  })

  it("Error.Id=5 + Info='Erreur X' → retourne le message", () => {
    expect((svc as any).extractErrorInfo({ Error: { Id: 5, Info: "Erreur X" } })).toBe("Erreur X")
  })

  it("ErrorList avec Id=0 vide → null", () => {
    expect((svc as any).extractErrorInfo({ ErrorList: [{ Id: 0, Tekst: "" }] })).toBeNull()
  })

  it("ErrorList avec message réel → retourne le message", () => {
    expect((svc as any).extractErrorInfo({
      Error: { Id: 0, Info: "" },
      ErrorList: [{ Id: 42, Tekst: "Adresse invalide" }],
    })).toBe("Adresse invalide")
  })

  it("réponse null → null", () => {
    expect((svc as any).extractErrorInfo(null)).toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// createShipment() — structure payload conforme API v3
// ════════════════════════════════════════════════════════════════════════════

describe("createShipment() — structure payload API v3", () => {
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

  const TOKEN_RESPONSE = { Key: "tok-abc", Expire: new Date(Date.now() + 3600000).toISOString() }

  function getShipmentBody() {
    // Le premier appel est POST /keys (ensureToken), le second est POST /shipments
    const shipmentCall = mockFetch.mock.calls.find((call: any[]) =>
      (call[0] as string).includes("/shipments")
    )
    if (!shipmentCall) throw new Error("Aucun appel /shipments trouvé")
    return JSON.parse(shipmentCall[1].body).Shipment[0]
  }

  it("utilise Address (pas Recipient) conformément à l'API v3", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE)) // POST /keys
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Shipment: [{ CarrierSelect: { Id: 1, Name: "bpost" } }] })))

    await svc.createShipment({ orderId: "order-1", recipient: baseRecipient })

    const s = getShipmentBody()
    expect(s.Address).toBeDefined()
    expect(s.Recipient).toBeUndefined()
    expect(s.Address.Name).toBe("Marie Dubois")
    expect(s.Address.Email).toBe("marie@example.com")
    expect(s.Address.PostalCode).toBe("1000")
    expect(s.Address.City).toBe("Bruxelles")
    expect(s.Address.Country).toBe("BE")
    expect(s.Address.Streetname1).toBe("Rue de la Paix 1")
  })

  it("utilise Dimensions.Weight (pas Parcel.Weight)", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Shipment: [{ CarrierSelect: { Id: 1 } }] })))

    await svc.createShipment({ orderId: "order-w", recipient: baseRecipient, weightGrams: 1500 })

    const s = getShipmentBody()
    expect(s.Dimensions).toBeDefined()
    expect(s.Dimensions.Weight).toBe(1500)
    expect(s.Parcel).toBeUndefined()
  })

  it("poids minimum 500g si absent ou 0", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Shipment: [{ CarrierSelect: { Id: 1 } }] })))

    await svc.createShipment({ orderId: "order-w0", recipient: baseRecipient, weightGrams: 0 })

    const s = getShipmentBody()
    expect(s.Dimensions.Weight).toBeGreaterThanOrEqual(500)
  })

  it("livraison domicile : pas de PickupPoint dans le payload", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Shipment: [{ CarrierSelect: { Id: 1 } }] })))

    await svc.createShipment({ orderId: "order-home", recipient: baseRecipient })

    const s = getShipmentBody()
    expect(s.PickupPoint).toBeUndefined()
    expect(s.Delivery).toBeUndefined()
  })

  it("point relais : PickupPoint.Id dans le payload", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Shipment: [{ CarrierSelect: { Id: 1 } }] })))

    await svc.createShipment({ orderId: "order-pp", recipient: baseRecipient, pickupPointId: "BPOST-PP-42" })

    const s = getShipmentBody()
    expect(s.PickupPoint?.Id).toBe("BPOST-PP-42")
    expect(s.Delivery).toBeUndefined()
  })

  it("ClientReference = orderId si reference absent", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Shipment: [{ CarrierSelect: { Id: 1 } }] })))

    await svc.createShipment({ orderId: "order-xyz", recipient: baseRecipient })

    const s = getShipmentBody()
    expect(s.ClientReference).toBe("order-xyz")
  })

  it("extrait le trackingNumber depuis Shipment[0].TrackingNumber", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Shipment: [{ TrackingNumber: "323456789BE", CarrierSelect: { Id: 1 } }] })))

    const r = await svc.createShipment({ orderId: "o", recipient: baseRecipient })
    expect(r.trackingNumber).toBe("323456789BE")
  })

  it("accepte TrackingCode comme alias de TrackingNumber", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Shipment: [{ TrackingCode: "323456789FR", CarrierSelect: { Id: 1 } }] })))

    const r = await svc.createShipment({ orderId: "o", recipient: baseRecipient })
    expect(r.trackingNumber).toBe("323456789FR")
  })

  it("Error.Id=0 dans la réponse → NE lève PAS d'erreur", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Shipment: [{ CarrierSelect: { Id: 1 } }] })))

    await expect(svc.createShipment({ orderId: "o", recipient: baseRecipient })).resolves.toBeDefined()
  })

  it("ErrorList avec vrai message → lève une erreur", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse({
        Error: { Id: 0, Info: "" },
        ErrorList: [{ Id: 10, Tekst: "Adresse introuvable" }],
        Shipment: [],
      }))

    await expect(svc.createShipment({ orderId: "o", recipient: baseRecipient })).rejects.toThrow("Adresse introuvable")
  })

  it("PDF binaire retourné directement → labelData base64", async () => {
    const svc = makeService()
    const pdfBytes = fakePdfBuffer()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(makePdfResponse(pdfBytes))

    const r = await svc.createShipment({ orderId: "o", recipient: baseRecipient })
    expect(r.labelData).toBeDefined()
    expect(r.labelUrl).toMatch(/^data:application\/pdf;base64,/)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getLabel() — formats de réponse
// ════════════════════════════════════════════════════════════════════════════

describe("getLabel()", () => {
  const TOKEN = { Key: "tok-gl", Expire: new Date(Date.now() + 3600000).toISOString() }

  it("PDF binaire direct → labelData base64", async () => {
    const svc = makeService()
    const pdf = fakePdfBuffer("direct binary label content padded for size testing")
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN)) // /keys
      .mockResolvedValueOnce(makePdfResponse(pdf))   // POST /labels → PDF direct

    const r = await svc.getLabel("ref-1")
    expect(r.labelData).toBe(pdf.toString("base64"))
    expect(r.labelUrl).toMatch(/^data:application\/pdf;base64,/)
  })

  it("CallbackURL dans la réponse JSON → polling puis PDF", async () => {
    jest.useFakeTimers()
    const svc = makeService()
    const pdf = fakePdfBuffer("polled pdf content with enough padding here")

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN))                                           // /keys
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ CallbackURL: "/v3/labels/run-123" }))) // POST /labels
      .mockResolvedValueOnce(makePdfResponse(pdf))                                             // GET /labels/run-123

    // Lancer getLabel et avancer les timers pour éviter le vrai délai de 2s
    const promise = svc.getLabel("ref-cb")
    jest.runAllTimersAsync()
    const r = await promise
    expect(r.labelData).toBe(pdf.toString("base64"))
  }, 10000)

  it("LabelData base64 dans la réponse JSON", async () => {
    const svc = makeService()
    const fakePdfB64 = fakePdfBuffer("label data encoded in base64 for testing purposes only").toString("base64")
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Label: [{ LabelData: fakePdfB64 }] })))

    const r = await svc.getLabel("ref-b64")
    expect(r.labelData).toBe(fakePdfB64)
    expect(r.labelUrl).toBe(`data:application/pdf;base64,${fakePdfB64}`)
  })

  it("Label[0].Url (URL directe) → labelUrl", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN))
      .mockResolvedValueOnce(makeJsonResponse(bpostOk({ Label: [{ Url: "https://labels.bpost.be/label.pdf" }] })))

    const r = await svc.getLabel("ref-url")
    expect(r.labelUrl).toBe("https://labels.bpost.be/label.pdf")
  })

  it("Error.Id=0 sans label → essaie toutes les stratégies → labelUrl vide", async () => {
    const svc = makeService()
    const tokenResp = makeJsonResponse(TOKEN)
    const noLabelResp = makeJsonResponse(bpostOk({}))
    // token + POST ClientRef + POST OrderRef + GET /labels/:ref + GET /shipments/:ref/label
    mockFetch
      .mockResolvedValueOnce(tokenResp)
      .mockResolvedValue(noLabelResp)

    const r = await svc.getLabel("ref-nolabel")
    expect(r.labelUrl).toBe("")
  })

  it("envoie ClientReferenceCodeList dans le POST /labels", async () => {
    const svc = makeService()
    const pdf = Buffer.from("%PDF-1.4 x")
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN))
      .mockResolvedValueOnce(makePdfResponse(pdf))

    await svc.getLabel("my-ref")

    const labelsCall = mockFetch.mock.calls.find((c: any[]) =>
      (c[0] as string).includes("/labels") && c[1]?.method === "POST"
    )
    expect(labelsCall).toBeDefined()
    const body = JSON.parse(labelsCall![1].body)
    expect(body.ClientReferenceCodeList).toContain("my-ref")
    expect(body.LabelType).toBe(0)
    expect(body.LabelStart).toBe(1)
  })

  it("retourne labelUrl='' sur 401 (erreur silencieuse, non bloquante)", async () => {
    const svc = makeService()
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(TOKEN))                            // /keys
      .mockResolvedValue(makeJsonResponse({ error: "Unauthorized" }, 401))      // toutes les tentatives
    const r = await svc.getLabel("bad")
    expect(r.labelUrl).toBe("")
  }, 10000)
})

// ════════════════════════════════════════════════════════════════════════════
// ping()
// ════════════════════════════════════════════════════════════════════════════

describe("ping()", () => {
  it("retourne ok=true si l'API répond", async () => {
    const svc = makeService()
    // ensureToken → POST /keys
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ Key: "tok-123", Expire: new Date(Date.now() + 3600000).toISOString() }))
    // getCarriers
    mockFetch.mockResolvedValueOnce(makeJsonResponse([{ Id: 1 }]))

    const r = await svc.ping()
    expect(r.ok).toBe(true)
  })

  it("retourne ok=false si réseau inaccessible", async () => {
    const svc = makeService()
    mockFetch.mockRejectedValue(new Error("Network failure"))

    const r = await svc.ping()
    expect(r.ok).toBe(false)
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
    expect(svc.validateWebhookSignature('{"event":"test"}', "wrong-sig")).toBe(false)
  })

  it("retourne false si webhookSecret non configuré", () => {
    const svc = makeService()
    expect(svc.validateWebhookSignature("body", "sig")).toBe(false)
  })
})
