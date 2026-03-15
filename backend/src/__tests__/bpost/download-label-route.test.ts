/**
 * Tests unitaires — GET /admin/bpost/download-label/:orderId
 *
 * Couvre :
 *  - Cas 1 : bpost_label_data (base64) en metadata → stream PDF
 *  - Cas 2 : bpost_label_url data URI → stream PDF
 *  - Cas 3 : bpost_label_url HTTP externe → redirect
 *  - Cas 4 : fallback Bpost API via bpost_shipment_id
 *    - 4a : retourne labelData → stream + mise en cache
 *    - 4b : retourne labelUrl data URI → stream
 *    - 4c : retourne labelUrl HTTP → redirect
 *  - Cas 5 : aucune donnée → 404
 *  - Cas 6 : commande sans bpost_shipment_id → 404
 *  - Cas 7 : erreur Bpost API → 500
 *  - Cas 8 : Content-Disposition correct (nom de fichier avec orderId)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetLabel = jest.fn()
const mockRetrieveOrder = jest.fn()
const mockUpdateOrders = jest.fn()

const mockScope = {
  resolve: jest.fn((token: string) => {
    if (token === "bpost") return { getLabel: mockGetLabel }
    if (token === "orderModuleService") return {
      retrieveOrder: mockRetrieveOrder,
      updateOrders: mockUpdateOrders,
    }
    return {}
  }),
}

jest.mock("@medusajs/framework/utils", () => ({
  Modules: {
    ORDER: "orderModuleService",
  },
  Module: jest.fn(() => ({})),
  ModuleProvider: jest.fn(() => ({})),
}))

// Mock du module Bpost (évite l'import de Module() de Medusa)
jest.mock("../../modules/bpost", () => ({
  BPOST_MODULE: "bpost",
  default: {},
}))

// ─── Import route ─────────────────────────────────────────────────────────────

import { GET } from "../../api/admin/bpost/download-label/[orderId]/route"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FAKE_PDF_CONTENT = "%PDF-1.3 fake content for testing"
const FAKE_PDF_BASE64 = Buffer.from(FAKE_PDF_CONTENT).toString("base64")
const FAKE_PDF_DATA_URI = `data:application/pdf;base64,${FAKE_PDF_BASE64}`

function makeReq(orderId: string) {
  return { params: { orderId }, scope: mockScope } as any
}

function makeRes() {
  const sentBuffers: Buffer[] = []
  const res = {
    _headers: {} as Record<string, string | number>,
    _redirectUrl: "",
    _statusCode: 200,
    setHeader: jest.fn((key: string, val: any) => { res._headers[key] = val }),
    send: jest.fn((buf: Buffer) => { sentBuffers.push(buf); return res }),
    redirect: jest.fn((code: number, url: string) => { res._statusCode = code; res._redirectUrl = url; return res }),
    status: jest.fn((code: number) => { res._statusCode = code; return res }),
    json: jest.fn().mockReturnThis(),
    getSentBuffer: () => sentBuffers[0] ?? null,
  }
  return res
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdateOrders.mockResolvedValue([])
})

// ════════════════════════════════════════════════════════════════════════════
// Cas 1 : bpost_label_data présent en metadata
// ════════════════════════════════════════════════════════════════════════════

describe("Cas 1 — bpost_label_data en metadata (base64)", () => {
  beforeEach(() => {
    mockRetrieveOrder.mockResolvedValue({
      id: "order-1",
      metadata: { bpost_label_data: FAKE_PDF_BASE64 },
    })
  })

  it("retourne un PDF (Content-Type: application/pdf)", async () => {
    const res = makeRes()
    await GET(makeReq("order-1"), res)
    expect(res._headers["Content-Type"]).toBe("application/pdf")
  })

  it("inclut le Content-Disposition avec le nom de fichier", async () => {
    const res = makeRes()
    await GET(makeReq("order-1"), res)
    expect(res._headers["Content-Disposition"]).toContain("order-1")
    expect(res._headers["Content-Disposition"]).toContain("attachment")
  })

  it("envoie le contenu PDF décodé correctement", async () => {
    const res = makeRes()
    await GET(makeReq("order-1"), res)
    const sentBuf = res.getSentBuffer()
    expect(sentBuf).toBeTruthy()
    expect(sentBuf!.toString("utf8")).toBe(FAKE_PDF_CONTENT)
  })

  it("ne fait pas d'appel à l'API Bpost", async () => {
    const res = makeRes()
    await GET(makeReq("order-1"), res)
    expect(mockGetLabel).not.toHaveBeenCalled()
  })

  it("inclut le Content-Length correct", async () => {
    const res = makeRes()
    await GET(makeReq("order-1"), res)
    const expectedLength = Buffer.from(FAKE_PDF_BASE64, "base64").length
    expect(res._headers["Content-Length"]).toBe(expectedLength)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Cas 2 : bpost_label_url = data URI
// ════════════════════════════════════════════════════════════════════════════

describe("Cas 2 — bpost_label_url est une data URI", () => {
  beforeEach(() => {
    mockRetrieveOrder.mockResolvedValue({
      id: "order-2",
      metadata: { bpost_label_url: FAKE_PDF_DATA_URI },
    })
  })

  it("décode la data URI et retourne un PDF", async () => {
    const res = makeRes()
    await GET(makeReq("order-2"), res)
    expect(res._headers["Content-Type"]).toBe("application/pdf")
    const sentBuf = res.getSentBuffer()
    expect(sentBuf!.toString("utf8")).toBe(FAKE_PDF_CONTENT)
  })

  it("ne fait pas d'appel à l'API Bpost", async () => {
    const res = makeRes()
    await GET(makeReq("order-2"), res)
    expect(mockGetLabel).not.toHaveBeenCalled()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Cas 3 : bpost_label_url = URL HTTP externe
// ════════════════════════════════════════════════════════════════════════════

describe("Cas 3 — bpost_label_url est une URL HTTP", () => {
  beforeEach(() => {
    mockRetrieveOrder.mockResolvedValue({
      id: "order-3",
      metadata: { bpost_label_url: "https://labels.bpost.be/label-abc.pdf" },
    })
  })

  it("effectue un redirect 302 vers l'URL", async () => {
    const res = makeRes()
    await GET(makeReq("order-3"), res)
    expect(res.redirect).toHaveBeenCalledWith(302, "https://labels.bpost.be/label-abc.pdf")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Cas 4 : Fallback Bpost API via bpost_shipment_id
// ════════════════════════════════════════════════════════════════════════════

describe("Cas 4a — fallback Bpost API, retourne labelData (base64)", () => {
  beforeEach(() => {
    mockRetrieveOrder.mockResolvedValue({
      id: "order-4a",
      metadata: { bpost_shipment_id: "SHP-FALLBACK" },
    })
    mockGetLabel.mockResolvedValue({ labelUrl: "", labelData: FAKE_PDF_BASE64 })
  })

  it("appelle getLabel avec le shipment ID", async () => {
    const res = makeRes()
    await GET(makeReq("order-4a"), res)
    expect(mockGetLabel).toHaveBeenCalledWith("SHP-FALLBACK")
  })

  it("retourne le PDF décodé", async () => {
    const res = makeRes()
    await GET(makeReq("order-4a"), res)
    expect(res._headers["Content-Type"]).toBe("application/pdf")
    expect(res.getSentBuffer()!.toString("utf8")).toBe(FAKE_PDF_CONTENT)
  })

  it("met en cache bpost_label_data dans la commande", async () => {
    const res = makeRes()
    await GET(makeReq("order-4a"), res)
    expect(mockUpdateOrders).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "order-4a",
          metadata: expect.objectContaining({ bpost_label_data: FAKE_PDF_BASE64 }),
        }),
      ])
    )
  })
})

describe("Cas 4b — fallback Bpost API, retourne labelUrl data URI", () => {
  beforeEach(() => {
    mockRetrieveOrder.mockResolvedValue({
      id: "order-4b",
      metadata: { bpost_shipment_id: "SHP-FB-DATAURI" },
    })
    mockGetLabel.mockResolvedValue({ labelUrl: FAKE_PDF_DATA_URI, labelData: undefined })
  })

  it("retourne le PDF décodé depuis data URI", async () => {
    const res = makeRes()
    await GET(makeReq("order-4b"), res)
    expect(res._headers["Content-Type"]).toBe("application/pdf")
    expect(res.getSentBuffer()!.toString("utf8")).toBe(FAKE_PDF_CONTENT)
  })
})

describe("Cas 4c — fallback Bpost API, retourne labelUrl HTTP", () => {
  beforeEach(() => {
    mockRetrieveOrder.mockResolvedValue({
      id: "order-4c",
      metadata: { bpost_shipment_id: "SHP-FB-HTTP" },
    })
    mockGetLabel.mockResolvedValue({ labelUrl: "https://labels.bpost.be/fallback.pdf", labelData: undefined })
  })

  it("effectue un redirect vers l'URL externe", async () => {
    const res = makeRes()
    await GET(makeReq("order-4c"), res)
    expect(res.redirect).toHaveBeenCalledWith(302, "https://labels.bpost.be/fallback.pdf")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Cas 5 & 6 : 404
// ════════════════════════════════════════════════════════════════════════════

describe("Cas 5 & 6 — 404 (données manquantes)", () => {
  it("retourne 404 si les metadata sont vides et aucun shipment ID", async () => {
    mockRetrieveOrder.mockResolvedValue({ id: "order-empty", metadata: {} })
    const res = makeRes()
    await GET(makeReq("order-empty"), res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
  })

  it("retourne 404 si Bpost ne renvoie ni labelData ni labelUrl", async () => {
    mockRetrieveOrder.mockResolvedValue({
      id: "order-no-label",
      metadata: { bpost_shipment_id: "SHP-NOLABEL" },
    })
    mockGetLabel.mockResolvedValue({ labelUrl: "", labelData: undefined })

    const res = makeRes()
    await GET(makeReq("order-no-label"), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Cas 7 : Erreur Bpost API → 500
// ════════════════════════════════════════════════════════════════════════════

describe("Cas 7 — Erreur API Bpost → 500", () => {
  it("retourne 500 si getLabel lance une exception", async () => {
    mockRetrieveOrder.mockResolvedValue({
      id: "order-error",
      metadata: { bpost_shipment_id: "SHP-ERR" },
    })
    mockGetLabel.mockRejectedValue(new Error("Bpost network error"))

    const res = makeRes()
    await GET(makeReq("order-error"), res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Bpost network error" })
    )
  })

  it("retourne 500 si retrieveOrder lance une exception", async () => {
    mockRetrieveOrder.mockRejectedValue(new Error("DB connection failed"))

    const res = makeRes()
    await GET(makeReq("order-db-err"), res)
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Cas 8 : Priorité correcte (cas 1 > cas 2 > cas 3 > cas 4)
// ════════════════════════════════════════════════════════════════════════════

describe("Priorité des données", () => {
  it("bpost_label_data a priorité sur bpost_label_url", async () => {
    mockRetrieveOrder.mockResolvedValue({
      id: "order-priority",
      metadata: {
        bpost_label_data: FAKE_PDF_BASE64,
        bpost_label_url: "https://external-url.pdf",
        bpost_shipment_id: "SHP-PRIO",
      },
    })

    const res = makeRes()
    await GET(makeReq("order-priority"), res)

    // Doit utiliser le base64, pas l'URL externe ni l'API Bpost
    expect(mockGetLabel).not.toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
    expect(res.getSentBuffer()).toBeTruthy()
    expect(res._headers["Content-Type"]).toBe("application/pdf")
  })
})
