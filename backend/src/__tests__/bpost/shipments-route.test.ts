/**
 * Tests unitaires — POST /admin/bpost/shipments
 *
 * Couvre :
 *  - Création normale (shipment + label + email)
 *  - Mode resend_only (renvoyer l'email sans créer de shipment)
 *  - send_email=false (pas d'email)
 *  - Stockage des données dans order.metadata
 *  - Gestion des erreurs (Bpost KO, metadata manquants)
 *  - Email non bloquant si le service de notif échoue
 */

// ─── Mocks des dépendances ────────────────────────────────────────────────────

const mockCreateShipment = jest.fn()
const mockGetLabel = jest.fn()
const mockRetrieveOrder = jest.fn()
const mockUpdateOrders = jest.fn()
const mockCreateNotifications = jest.fn()
const mockListProducts = jest.fn()

const mockScope = {
  resolve: jest.fn((token: string) => {
    if (token === "bpost") return { createShipment: mockCreateShipment, getLabel: mockGetLabel }
    if (token === "orderModuleService") return { retrieveOrder: mockRetrieveOrder, updateOrders: mockUpdateOrders }
    if (token === "notificationModuleService") return { createNotifications: mockCreateNotifications }
    if (token === "productModuleService") return { listProducts: mockListProducts }
    return {}
  }),
}

// Mock des modules Medusa (@medusajs/framework/utils Modules enum)
jest.mock("@medusajs/framework/utils", () => ({
  Modules: {
    ORDER: "orderModuleService",
    NOTIFICATION: "notificationModuleService",
    PRODUCT: "productModuleService",
  },
  Module: jest.fn(() => ({})),
  ModuleProvider: jest.fn(() => ({})),
}))

// Mock du module Bpost (évite l'import de Module() de Medusa)
jest.mock("../../modules/bpost", () => ({
  BPOST_MODULE: "bpost",
  default: {},
}))

// Mock des templates d'email
jest.mock("../../modules/email-notifications/templates", () => ({
  EmailTemplates: { ORDER_SHIPPED: "order-shipped" },
}))

// Mock des constantes
jest.mock("../../lib/constants", () => ({
  STORE_URL: "https://www.sellerie-lacabrade.be",
}))

// ─── Import de la route (après les mocks) ────────────────────────────────────

import { POST } from "../../api/admin/bpost/shipments/route"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseOrder = {
  id: "order-test-1",
  email: "client@example.com",
  display_id: "1234",
  metadata: {},
  shipping_address: {
    id: "addr-1",
    first_name: "Marie",
    last_name: "Dupont",
    address_1: "Rue du Moulin 10",
    postal_code: "1000",
    city: "Bruxelles",
    country_code: "BE",
    phone: "+32 499 00 00 01",
  },
  items: [],
}

const baseShipmentResult = {
  shipmentId: "SHP-001",
  trackingNumber: "323456789BE",
  labelUrl: "",
}

function makeReq(body: Record<string, any>) {
  return {
    body,
    scope: mockScope,
    params: {},
  } as any
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null as any,
    status: jest.fn().mockReturnThis(),
    json: jest.fn((body) => { res._body = body; return res }),
    redirect: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  }
  return res
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockRetrieveOrder.mockResolvedValue({ ...baseOrder })
  mockUpdateOrders.mockResolvedValue([{ ...baseOrder }])
  mockCreateShipment.mockResolvedValue({ ...baseShipmentResult })
  mockGetLabel.mockResolvedValue({ labelUrl: "", labelData: undefined })
  mockCreateNotifications.mockResolvedValue([{}])
  mockListProducts.mockResolvedValue([])
})

// ════════════════════════════════════════════════════════════════════════════
// Mode normal — création de shipment
// ════════════════════════════════════════════════════════════════════════════

describe("Mode création de shipment", () => {
  it("crée un shipment et retourne success=true", async () => {
    const req = makeReq({ order_id: "order-test-1" })
    const res = makeRes()

    await POST(req, res)

    expect(mockCreateShipment).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  it("sauvegarde bpost_shipment_id, bpost_tracking et bpost_label_url dans metadata", async () => {
    const req = makeReq({ order_id: "order-test-1" })
    const res = makeRes()

    await POST(req, res)

    const updateCall = mockUpdateOrders.mock.calls[0][0]
    const newMeta = updateCall[0].metadata
    expect(newMeta.bpost_shipment_id).toBe("SHP-001")
    expect(newMeta.bpost_tracking).toBe("323456789BE")
    expect(newMeta.bpost_label_url).toBeDefined()
  })

  it("stocke bpost_label_data si Bpost retourne du base64", async () => {
    const fakePdf = Buffer.from("%PDF-fake").toString("base64")
    mockGetLabel.mockResolvedValueOnce({ labelUrl: `data:application/pdf;base64,${fakePdf}`, labelData: fakePdf })

    const req = makeReq({ order_id: "order-test-1" })
    const res = makeRes()

    await POST(req, res)

    const updateCall = mockUpdateOrders.mock.calls[0][0]
    expect(updateCall[0].metadata.bpost_label_data).toBe(fakePdf)
  })

  it("envoie l'email de suivi avec le bon tracking number", async () => {
    const req = makeReq({ order_id: "order-test-1", send_email: true })
    const res = makeRes()

    await POST(req, res)

    expect(mockCreateNotifications).toHaveBeenCalledTimes(1)
    const notifCall = mockCreateNotifications.mock.calls[0][0]
    expect(notifCall.to).toBe("client@example.com")
    expect(notifCall.template).toBe("order-shipped")
    expect(notifCall.data.fulfillment.tracking_numbers).toContain("323456789BE")
    expect(notifCall.data.fulfillment.data.public_tracking_url).toContain("323456789BE")
  })

  it("retourne email_sent=true quand l'email est bien envoyé", async () => {
    const req = makeReq({ order_id: "order-test-1", send_email: true })
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ email_sent: true })
    )
  })

  it("retourne email_sent=false quand send_email=false", async () => {
    const req = makeReq({ order_id: "order-test-1", send_email: false })
    const res = makeRes()

    await POST(req, res)

    expect(mockCreateNotifications).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ email_sent: false })
    )
  })

  it("ne plante pas si l'email échoue (erreur non bloquante)", async () => {
    mockCreateNotifications.mockRejectedValueOnce(new Error("SMTP error"))

    const req = makeReq({ order_id: "order-test-1", send_email: true })
    const res = makeRes()

    await POST(req, res)

    // La réponse HTTP doit quand même être un succès
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  it("n'envoie pas d'email si trackingNumber est absent", async () => {
    mockCreateShipment.mockResolvedValueOnce({ shipmentId: "SHP-NO-TRACK", trackingNumber: undefined })

    const req = makeReq({ order_id: "order-test-1", send_email: true })
    const res = makeRes()

    await POST(req, res)

    expect(mockCreateNotifications).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ email_sent: false })
    )
  })

  it("utilise le point relais de metadata si pickup_point_id absent", async () => {
    mockRetrieveOrder.mockResolvedValueOnce({
      ...baseOrder,
      metadata: { bpost_pickup_point: { Id: "PP-META-42", Name: "Bpost Shop Brussels" } },
    })

    const req = makeReq({ order_id: "order-test-1" })
    const res = makeRes()

    await POST(req, res)

    const createShipmentCall = mockCreateShipment.mock.calls[0][0]
    expect(createShipmentCall.pickupPointId).toBe("PP-META-42")
  })

  it("retourne 500 si createShipment échoue", async () => {
    mockCreateShipment.mockRejectedValueOnce(new Error("Bpost API down"))

    const req = makeReq({ order_id: "order-test-1" })
    const res = makeRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Bpost API down" })
    )
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Mode resend_only — renvoyer l'email sans recréer de shipment
// ════════════════════════════════════════════════════════════════════════════

describe("Mode resend_only", () => {
  beforeEach(() => {
    mockRetrieveOrder.mockResolvedValue({
      ...baseOrder,
      metadata: {
        bpost_tracking: "323456789BE",
        bpost_label_url: "https://labels.bpost.be/label.pdf",
        bpost_shipment_id: "SHP-001",
      },
    })
  })

  it("renvoie l'email avec le tracking existant sans appeler createShipment", async () => {
    const req = makeReq({ order_id: "order-test-1", resend_only: true })
    const res = makeRes()

    await POST(req, res)

    expect(mockCreateShipment).not.toHaveBeenCalled()
    expect(mockCreateNotifications).toHaveBeenCalledTimes(1)
    const notifCall = mockCreateNotifications.mock.calls[0][0]
    expect(notifCall.data.fulfillment.tracking_numbers).toContain("323456789BE")
  })

  it("retourne email_sent=true si l'email est envoyé", async () => {
    const req = makeReq({ order_id: "order-test-1", resend_only: true })
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, email_sent: true, tracking_number: "323456789BE" })
    )
  })

  it("retourne 400 si aucun tracking n'existe en metadata", async () => {
    mockRetrieveOrder.mockResolvedValueOnce({ ...baseOrder, metadata: {} })

    const req = makeReq({ order_id: "order-test-1", resend_only: true })
    const res = makeRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockCreateShipment).not.toHaveBeenCalled()
    expect(mockCreateNotifications).not.toHaveBeenCalled()
  })

  it("ne modifie pas les métadonnées de la commande", async () => {
    const req = makeReq({ order_id: "order-test-1", resend_only: true })
    const res = makeRes()

    await POST(req, res)

    expect(mockUpdateOrders).not.toHaveBeenCalled()
  })

  it("retourne email_sent=false si la notification échoue", async () => {
    mockCreateNotifications.mockRejectedValueOnce(new Error("SMTP down"))

    const req = makeReq({ order_id: "order-test-1", resend_only: true })
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, email_sent: false })
    )
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Contenu de l'email envoyé
// ════════════════════════════════════════════════════════════════════════════

describe("Contenu de l'email de suivi", () => {
  it("l'email contient l'URL de suivi Bpost valide", async () => {
    const req = makeReq({ order_id: "order-test-1", send_email: true })
    const res = makeRes()

    await POST(req, res)

    const notifData = mockCreateNotifications.mock.calls[0][0].data
    expect(notifData.fulfillment.data.public_tracking_url).toMatch(
      /^https:\/\/track\.bpost\.cloud\//
    )
    expect(notifData.fulfillment.data.public_tracking_url).toContain("323456789BE")
  })

  it("l'email contient l'adresse de livraison correcte", async () => {
    const req = makeReq({ order_id: "order-test-1", send_email: true })
    const res = makeRes()

    await POST(req, res)

    const notifData = mockCreateNotifications.mock.calls[0][0].data
    expect(notifData.shippingAddress.postal_code).toBe("1000")
    expect(notifData.shippingAddress.city).toBe("Bruxelles")
  })

  it("le sujet de l'email inclut le display_id", async () => {
    const req = makeReq({ order_id: "order-test-1", send_email: true })
    const res = makeRes()

    await POST(req, res)

    const subject = mockCreateNotifications.mock.calls[0][0].data.emailOptions.subject
    expect(subject).toContain("1234")
  })
})
