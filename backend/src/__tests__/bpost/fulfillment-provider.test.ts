/**
 * Tests — BpostFulfillmentProviderService.createFulfillment
 *
 * Le container d'un fulfillment provider Medusa est un cradle Awilix :
 * this.container.resolve("bpost") lève AwilixResolutionError ('resolve').
 * On vérifie que l'étiquette suit toujours la logique établie
 * (seuil 250 €, createShipment, getLabel) sans passer par ce resolve.
 */

const mockCreateShipment = jest.fn()
const mockGetLabel = jest.fn()

jest.mock("../../modules/bpost/service", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      createShipment: mockCreateShipment,
      getLabel: mockGetLabel,
    })),
    extractBpostTrackingFromPdf: jest.fn(),
  }
})

jest.mock("@medusajs/framework/utils", () => ({
  AbstractFulfillmentProviderService: class AbstractFulfillmentProviderService {},
}))

import BpostFulfillmentProviderService, {
  createBpostClient,
} from "../../modules/bpost-fulfillment/service"
import BpostModuleService from "../../modules/bpost/service"

function makeAwilixCradle() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const err: any = new Error(`Could not resolve '${String(prop)}'.`)
        err.name = "AwilixResolutionError"
        throw err
      },
    }
  )
}

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: "order_1",
    email: "client@example.com",
    total: 8000,
    shipping_address: {
      first_name: "Jean",
      last_name: "Dupont",
      phone: "0470123456",
      address_1: "Rue de la Selle 1",
      address_2: "",
      postal_code: "1000",
      city: "Bruxelles",
      country_code: "BE",
    },
    metadata: {},
    ...overrides,
  }
}

beforeEach(() => {
  mockCreateShipment.mockReset()
  mockGetLabel.mockReset()
  ;(BpostModuleService as jest.Mock).mockClear()
  mockCreateShipment.mockResolvedValue({
    shipmentId: "shp_1",
    clientReference: "ref_1",
    trackingNumber: "323200000000000000",
  })
  mockGetLabel.mockResolvedValue({ labelUrl: "https://labels.example/1.pdf" })
})

describe("createBpostClient", () => {
  it("instancie BpostModuleService sans toucher au container", () => {
    const client = createBpostClient({
      publicKey: "pk",
      privateKey: "sk",
      webhookSecret: "wh",
    })
    expect(BpostModuleService).toHaveBeenCalledWith(
      {},
      { publicKey: "pk", privateKey: "sk", webhookSecret: "wh" }
    )
    expect(client.createShipment).toBe(mockCreateShipment)
  })
})

describe("BpostFulfillmentProviderService.createFulfillment", () => {
  it("crée l'étiquette malgré un cradle Awilix sans resolve", async () => {
    const provider = new BpostFulfillmentProviderService(makeAwilixCradle() as any, {
      publicKey: "pk",
      privateKey: "sk",
    })

    const result = await provider.createFulfillment(
      { pickup_point_id: "PP-1" },
      [],
      makeOrder(),
      {}
    )

    expect(mockCreateShipment).toHaveBeenCalledTimes(1)
    expect(mockCreateShipment).toHaveBeenCalledWith({
      orderId: "order_1",
      recipient: {
        name: "Jean Dupont",
        email: "client@example.com",
        phone: "0470123456",
        address: {
          address_1: "Rue de la Selle 1",
          address_2: "",
          postal_code: "1000",
          city: "Bruxelles",
          country_code: "BE",
        },
      },
      pickupPointId: "PP-1",
      weightGrams: undefined,
      reference: "order_1",
    })
    expect(mockGetLabel).toHaveBeenCalledWith("shp_1", "ref_1")
    expect(result.data.label_url).toBe("https://labels.example/1.pdf")
    expect(result.data.public_tracking_url).toContain("323200000000000000")
  })

  it("ne génère pas d'étiquette automatique au-dessus de 250 €", async () => {
    const provider = new BpostFulfillmentProviderService(makeAwilixCradle() as any, {
      publicKey: "pk",
      privateKey: "sk",
    })

    const result = await provider.createFulfillment(
      {},
      [],
      makeOrder({ total: 25001 }),
      {}
    )

    expect(mockCreateShipment).not.toHaveBeenCalled()
    expect(result.data).toEqual({
      auto_label_skipped: true,
      reason: "order_above_250_eur",
    })
  })

  it("reprend le point relais depuis les metadata commande", async () => {
    const provider = new BpostFulfillmentProviderService(makeAwilixCradle() as any, {
      publicKey: "pk",
      privateKey: "sk",
    })

    await provider.createFulfillment(
      {},
      [],
      makeOrder({
        metadata: { bpost_pickup_point: { Id: "META-PP" } },
      }),
      {}
    )

    expect(mockCreateShipment.mock.calls[0][0].pickupPointId).toBe("META-PP")
  })
})
