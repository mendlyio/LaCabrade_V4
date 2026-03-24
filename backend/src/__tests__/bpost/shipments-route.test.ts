/**
 * Tests d'intégration — Route POST /admin/bpost/shipments
 *
 * Couvre le flux complet de bout-en-bout :
 *  1. Création du shipment Bpost
 *  2. Récupération de l'étiquette PDF
 *  3. Sauvegarde en métadonnées de la commande
 *  4. Envoi de l'email de suivi au client
 *  5. Mode resend_only (renvoi email sans recréer le shipment)
 *  6. Cas sans tracking number (email envoyé quand même)
 */

// Medusa utilise 'utils/assert-value' qui n'est pas résolu dans Jest en dehors de .medusa/server
jest.mock("utils/assert-value", () => ({ assertValue: (v: any) => v }), { virtual: true })

import { POST } from "../../api/admin/bpost/shipments/route"
import { BPOST_MODULE } from "../../modules/bpost"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFakePdf(label = "fake"): Buffer {
  const header = "%PDF-1.4\n"
  const body = `fake pdf content for bpost label ${label} `.repeat(5)
  return Buffer.from(header + body, "utf-8")
}

const FAKE_PDF = makeFakePdf()
const FAKE_PDF_B64 = FAKE_PDF.toString("base64")

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateShipment = jest.fn()
const mockGetLabel = jest.fn()
const mockRetrieveOrder = jest.fn()
const mockUpdateOrders = jest.fn()
const mockCreateNotifications = jest.fn()
const mockListProducts = jest.fn()

function makeScope(overrides: Partial<Record<string, any>> = {}) {
  return {
    resolve: (module: string) => {
      if (module === BPOST_MODULE) {
        return {
          createShipment: mockCreateShipment,
          getLabel: mockGetLabel,
          ...overrides.bpost,
        }
      }
      if (module === "order") {
        return {
          retrieveOrder: mockRetrieveOrder,
          updateOrders: mockUpdateOrders,
          ...overrides.order,
        }
      }
      if (module === "notification") {
        return {
          createNotifications: mockCreateNotifications,
          ...overrides.notification,
        }
      }
      if (module === "product") {
        return {
          listProducts: mockListProducts,
          ...overrides.product,
        }
      }
      // Medusa module constants
      if (module === "ORDER") return { retrieveOrder: mockRetrieveOrder, updateOrders: mockUpdateOrders }
      if (module === "NOTIFICATION") return { createNotifications: mockCreateNotifications }
      if (module === "PRODUCT") return { listProducts: mockListProducts }
      throw new Error(`Unknown module: ${module}`)
    },
  }
}

function makeRequest(body: Record<string, any>, scopeOverrides: Partial<Record<string, any>> = {}) {
  return {
    body,
    scope: makeScope(scopeOverrides),
  } as any
}

function makeResponse() {
  const res: any = {
    _status: 200,
    _body: null,
    _headers: {} as Record<string, any>,
    _redirect: null,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockImplementation((body: any) => { res._body = body; return res }),
    send: jest.fn().mockImplementation((body: any) => { res._body = body; return res }),
    setHeader: jest.fn().mockImplementation((k: string, v: any) => { res._headers[k] = v; return res }),
    redirect: jest.fn().mockImplementation((code: number, url: string) => { res._redirect = { code, url }; return res }),
  }
  res.status.mockImplementation((code: number) => { res._status = code; return res })
  return res
}

const BASE_ORDER = {
  id: "order_test123",
  display_id: "99",
  email: "client@example.com",
  metadata: {},
  shipping_address: {
    first_name: "Marie",
    last_name: "Dupont",
    address_1: "Rue de la Paix 1",
    postal_code: "1000",
    city: "Bruxelles",
    country_code: "BE",
    phone: "+32 499 00 00 01",
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRetrieveOrder.mockResolvedValue(BASE_ORDER)
  mockUpdateOrders.mockResolvedValue([BASE_ORDER])
  mockCreateNotifications.mockResolvedValue({})
  mockListProducts.mockResolvedValue([])
})

// ════════════════════════════════════════════════════════════════════════════
// FLUX NOMINAL : création + label + email
// ════════════════════════════════════════════════════════════════════════════

describe("Flux nominal — shipment + label + email", () => {
  it("crée le shipment, récupère le PDF et envoie l'email", async () => {
    mockCreateShipment.mockResolvedValue({
      shipmentId: "order_test123",
      clientReference: "order_test123",
      trackingNumber: undefined, // pas de tracking depuis POST /shipments (spec API)
    })
    mockGetLabel.mockResolvedValue({
      labelUrl: `data:application/pdf;base64,${FAKE_PDF_B64}`,
      labelData: FAKE_PDF_B64,
      trackingNumber: "323456789BE", // barcode extrait du label
    })

    const req = makeRequest({ order_id: "order_test123", send_email: true })
    const res = makeResponse()
    await POST(req, res)

    // Shipment créé
    expect(mockCreateShipment).toHaveBeenCalledWith(expect.objectContaining({
      orderId: "order_test123",
      recipient: expect.objectContaining({ name: "Marie Dupont" }),
    }))

    // Label récupéré
    expect(mockGetLabel).toHaveBeenCalledWith("order_test123", "order_test123")

    // Métadonnées sauvegardées
    expect(mockUpdateOrders).toHaveBeenCalledWith([expect.objectContaining({
      id: "order_test123",
      metadata: expect.objectContaining({
        bpost_client_reference: "order_test123",
        bpost_tracking: "323456789BE",
        bpost_label_data: FAKE_PDF_B64,
        bpost_label_url: `data:application/pdf;base64,${FAKE_PDF_B64}`,
      }),
    })])

    // Email envoyé
    expect(mockCreateNotifications).toHaveBeenCalledWith(expect.objectContaining({
      to: "client@example.com",
      channel: "email",
    }))

    // Réponse HTTP correcte
    expect(res._body.success).toBe(true)
    expect(res._body.tracking_number).toBe("323456789BE")
    expect(res._body.email_sent).toBe(true)
  })

  it("email envoyé même sans tracking number (template gère ce cas)", async () => {
    mockCreateShipment.mockResolvedValue({
      shipmentId: "order_test123",
      clientReference: "order_test123",
    })
    mockGetLabel.mockResolvedValue({
      labelUrl: `data:application/pdf;base64,${FAKE_PDF_B64}`,
      labelData: FAKE_PDF_B64,
      trackingNumber: undefined, // Bpost n'a pas fourni de tracking
    })

    const req = makeRequest({ order_id: "order_test123", send_email: true })
    const res = makeResponse()
    await POST(req, res)

    // Email quand même envoyé
    expect(mockCreateNotifications).toHaveBeenCalledTimes(1)

    // tracking_numbers doit être vide (pas [""] qui serait interprété comme un tracking)
    const notifData = mockCreateNotifications.mock.calls[0][0].data
    expect(notifData.fulfillment.tracking_numbers).toEqual([])

    expect(res._body.success).toBe(true)
    expect(res._body.email_sent).toBe(true)
  })

  it("URL de tracking Bpost correcte dans l'email (track.bpost.cloud)", async () => {
    mockCreateShipment.mockResolvedValue({
      shipmentId: "order_test123",
      clientReference: "order_test123",
    })
    mockGetLabel.mockResolvedValue({
      labelUrl: `data:application/pdf;base64,${FAKE_PDF_B64}`,
      labelData: FAKE_PDF_B64,
      trackingNumber: "323456789BE",
    })

    const req = makeRequest({ order_id: "order_test123", send_email: true })
    await POST(req, makeResponse())

    const notifData = mockCreateNotifications.mock.calls[0][0].data
    expect(notifData.fulfillment.data.public_tracking_url).toMatch(
      /^https:\/\/track\.bpost\.cloud\/btr\/web\/#\/search\?itemCode=323456789BE/
    )
    expect(notifData.fulfillment.data.public_tracking_url).toContain("postalCode=1000")
    expect(notifData.fulfillment.data.public_tracking_url).toContain("lang=fr")
  })

  it("pas d'URL de tracking si pas de tracking number", async () => {
    mockCreateShipment.mockResolvedValue({ shipmentId: "order_test123", clientReference: "order_test123" })
    mockGetLabel.mockResolvedValue({ labelUrl: "", labelData: undefined, trackingNumber: undefined })

    const req = makeRequest({ order_id: "order_test123", send_email: true })
    await POST(req, makeResponse())

    const notifData = mockCreateNotifications.mock.calls[0][0].data
    expect(notifData.fulfillment.data.public_tracking_url).toBe("")
  })

  it("PDF base64 stocké dans bpost_label_data (évite re-auth Bpost)", async () => {
    mockCreateShipment.mockResolvedValue({ shipmentId: "order_test123", clientReference: "order_test123" })
    mockGetLabel.mockResolvedValue({
      labelUrl: `data:application/pdf;base64,${FAKE_PDF_B64}`,
      labelData: FAKE_PDF_B64,
    })

    const req = makeRequest({ order_id: "order_test123" })
    await POST(req, makeResponse())

    const savedMeta = mockUpdateOrders.mock.calls[0][0][0].metadata
    expect(savedMeta.bpost_label_data).toBe(FAKE_PDF_B64)
    // labelData est un vrai PDF
    const decoded = Buffer.from(savedMeta.bpost_label_data, "base64")
    expect(decoded.subarray(0, 5).toString("utf-8")).toBe("%PDF-")
  })

  it("label avec URL HTTP stockée dans bpost_label_url", async () => {
    mockCreateShipment.mockResolvedValue({ shipmentId: "order_test123", clientReference: "order_test123" })
    mockGetLabel.mockResolvedValue({
      labelUrl: "https://labels.bpost.be/label-123.pdf",
      labelData: undefined,
      trackingNumber: "323456789BE",
    })

    const req = makeRequest({ order_id: "order_test123" })
    await POST(req, makeResponse())

    const savedMeta = mockUpdateOrders.mock.calls[0][0][0].metadata
    expect(savedMeta.bpost_label_url).toBe("https://labels.bpost.be/label-123.pdf")
    expect(savedMeta.bpost_label_data).toBeUndefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// MODE RESEND_ONLY
// ════════════════════════════════════════════════════════════════════════════

describe("Mode resend_only — renvoi email sans recréer le shipment", () => {
  it("renvoie l'email avec le tracking existant en metadata", async () => {
    mockRetrieveOrder.mockResolvedValue({
      ...BASE_ORDER,
      metadata: {
        bpost_tracking: "323456789BE",
        bpost_label_url: `data:application/pdf;base64,${FAKE_PDF_B64}`,
      },
    })

    const req = makeRequest({ order_id: "order_test123", resend_only: true })
    const res = makeResponse()
    await POST(req, res)

    // PAS de création de shipment
    expect(mockCreateShipment).not.toHaveBeenCalled()
    // Email envoyé
    expect(mockCreateNotifications).toHaveBeenCalledTimes(1)
    expect(res._body.success).toBe(true)
    expect(res._body.email_sent).toBe(true)
    expect(res._body.tracking_number).toBe("323456789BE")
  })

  it("retourne 400 si resend_only mais pas de tracking en metadata", async () => {
    mockRetrieveOrder.mockResolvedValue({ ...BASE_ORDER, metadata: {} })

    const req = makeRequest({ order_id: "order_test123", resend_only: true })
    const res = makeResponse()
    await POST(req, res)

    expect(res._status).toBe(400)
    expect(mockCreateNotifications).not.toHaveBeenCalled()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// POINT RELAIS
// ════════════════════════════════════════════════════════════════════════════

describe("Livraison point relais", () => {
  it("transmet pickup_point_id à createShipment", async () => {
    mockCreateShipment.mockResolvedValue({ shipmentId: "order_test123", clientReference: "order_test123" })
    mockGetLabel.mockResolvedValue({ labelUrl: "", labelData: undefined })

    const req = makeRequest({ order_id: "order_test123", pickup_point_id: "PP-BRUX-42" })
    await POST(req, makeResponse())

    expect(mockCreateShipment).toHaveBeenCalledWith(expect.objectContaining({
      pickupPointId: "PP-BRUX-42",
    }))
  })

  it("utilise le pickup_point depuis les metadata si absent du body", async () => {
    mockRetrieveOrder.mockResolvedValue({
      ...BASE_ORDER,
      metadata: { bpost_pickup_point: { Id: "PP-META-99" } },
    })
    mockCreateShipment.mockResolvedValue({ shipmentId: "order_test123", clientReference: "order_test123" })
    mockGetLabel.mockResolvedValue({ labelUrl: "", labelData: undefined })

    const req = makeRequest({ order_id: "order_test123" })
    await POST(req, makeResponse())

    expect(mockCreateShipment).toHaveBeenCalledWith(expect.objectContaining({
      pickupPointId: "PP-META-99",
    }))
  })
})

// ════════════════════════════════════════════════════════════════════════════
// GESTION D'ERREURS
// ════════════════════════════════════════════════════════════════════════════

describe("Gestion des erreurs", () => {
  it("retourne 500 si createShipment lève une erreur", async () => {
    mockCreateShipment.mockRejectedValue(new Error("Bpost API down"))

    const req = makeRequest({ order_id: "order_test123" })
    const res = makeResponse()
    await POST(req, res)

    expect(res._status).toBe(500)
    expect(res._body.success).toBe(false)
    expect(res._body.message).toContain("Bpost API down")
  })

  it("email échec non bloquant — réponse success=true quand même", async () => {
    mockCreateShipment.mockResolvedValue({ shipmentId: "order_test123", clientReference: "order_test123" })
    mockGetLabel.mockResolvedValue({ labelUrl: "", labelData: undefined, trackingNumber: "323456789BE" })
    mockCreateNotifications.mockRejectedValue(new Error("Resend down"))

    const req = makeRequest({ order_id: "order_test123", send_email: true })
    const res = makeResponse()
    await POST(req, res)

    expect(res._body.success).toBe(true)
    expect(res._body.email_sent).toBe(false)  // email échoué mais pas bloquant
  })

  it("label échec non bloquant — succès sans PDF", async () => {
    mockCreateShipment.mockResolvedValue({ shipmentId: "order_test123", clientReference: "order_test123" })
    mockGetLabel.mockRejectedValue(new Error("Label generation failed"))

    const req = makeRequest({ order_id: "order_test123" })
    const res = makeResponse()
    await POST(req, res)

    // Le shipment est quand même considéré comme un succès
    expect(res._body.success).toBe(true)
    // Label vide dans les métadonnées
    const savedMeta = mockUpdateOrders.mock.calls[0][0][0].metadata
    expect(savedMeta.bpost_label_url).toBe("")
  })

  it("send_email=false → pas d'email envoyé", async () => {
    mockCreateShipment.mockResolvedValue({ shipmentId: "order_test123", clientReference: "order_test123" })
    mockGetLabel.mockResolvedValue({ labelUrl: "", labelData: undefined, trackingNumber: "323456789BE" })

    const req = makeRequest({ order_id: "order_test123", send_email: false })
    await POST(req, makeResponse())

    expect(mockCreateNotifications).not.toHaveBeenCalled()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// SUJET ET CONTENU EMAIL
// ════════════════════════════════════════════════════════════════════════════

describe("Contenu email de suivi", () => {
  beforeEach(() => {
    mockCreateShipment.mockResolvedValue({ shipmentId: "order_test123", clientReference: "order_test123" })
    mockGetLabel.mockResolvedValue({
      labelUrl: `data:application/pdf;base64,${FAKE_PDF_B64}`,
      labelData: FAKE_PDF_B64,
      trackingNumber: "323456789BE",
    })
  })

  it("sujet email contient le display_id de la commande", async () => {
    const req = makeRequest({ order_id: "order_test123", send_email: true })
    await POST(req, makeResponse())

    const notifCall = mockCreateNotifications.mock.calls[0][0]
    expect(notifCall.data.emailOptions.subject).toContain("#99")
  })

  it("email envoyé à l'adresse du client", async () => {
    const req = makeRequest({ order_id: "order_test123", send_email: true })
    await POST(req, makeResponse())

    expect(mockCreateNotifications.mock.calls[0][0].to).toBe("client@example.com")
  })

  it("replyTo = contact@sellerie-lacabrade.be", async () => {
    const req = makeRequest({ order_id: "order_test123", send_email: true })
    await POST(req, makeResponse())

    const notifCall = mockCreateNotifications.mock.calls[0][0]
    expect(notifCall.data.emailOptions.replyTo).toBe("contact@sellerie-lacabrade.be")
  })

  it("fulfillment.tracking_numbers contient le bon numéro", async () => {
    const req = makeRequest({ order_id: "order_test123", send_email: true })
    await POST(req, makeResponse())

    const notifData = mockCreateNotifications.mock.calls[0][0].data
    expect(notifData.fulfillment.tracking_numbers).toContain("323456789BE")
  })

  it("shippingAddress transmis à l'email", async () => {
    const req = makeRequest({ order_id: "order_test123", send_email: true })
    await POST(req, makeResponse())

    const notifData = mockCreateNotifications.mock.calls[0][0].data
    expect(notifData.shippingAddress.city).toBe("Bruxelles")
    expect(notifData.shippingAddress.postal_code).toBe("1000")
  })
})
