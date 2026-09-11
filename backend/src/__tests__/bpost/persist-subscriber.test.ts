/**
 * Subscriber fulfillment.created — persist metadata uniquement.
 * Ne doit jamais appeler createShipment (doublon historique).
 */

const mockRetrieveFulfillment = jest.fn()
const mockRetrieveOrder = jest.fn()
const mockUpdateOrders = jest.fn()
const mockCreateShipment = jest.fn()

jest.mock("@medusajs/framework/utils", () => ({
  Modules: {
    FULFILLMENT: "fulfillmentModuleService",
    ORDER: "orderModuleService",
  },
}))

jest.mock("@medusajs/medusa", () => ({}))

import handler from "../../subscribers/bpost-create-shipment"

function makeContainer() {
  return {
    resolve: (token: string) => {
      if (token === "fulfillmentModuleService") {
        return { retrieveFulfillment: mockRetrieveFulfillment }
      }
      if (token === "orderModuleService") {
        return {
          retrieveOrder: mockRetrieveOrder,
          updateOrders: mockUpdateOrders,
        }
      }
      throw new Error(`unexpected resolve ${token}`)
    },
  }
}

beforeEach(() => {
  mockRetrieveFulfillment.mockReset()
  mockRetrieveOrder.mockReset()
  mockUpdateOrders.mockReset()
  mockCreateShipment.mockReset()
})

describe("bpostCreateShipmentHandler", () => {
  it("copie fulfillment.data vers order.metadata sans créer de shipment", async () => {
    mockRetrieveFulfillment.mockResolvedValue({
      id: "ful_1",
      provider_id: "bpost_bpost",
      order_id: "order_1",
      data: {
        shipmentId: "shp_1",
        clientReference: "order_1",
        label_data: "JVBERi0x",
        label_url: "data:application/pdf;base64,JVBERi0x",
        tracking_number: "323200000000000000",
      },
    })
    mockRetrieveOrder.mockResolvedValue({ id: "order_1", metadata: {} })
    mockUpdateOrders.mockResolvedValue([])

    await handler({
      event: { data: { id: "ful_1" } },
      container: makeContainer(),
    } as any)

    expect(mockCreateShipment).not.toHaveBeenCalled()
    expect(mockUpdateOrders).toHaveBeenCalledWith([
      {
        id: "order_1",
        metadata: {
          bpost_shipment_id: "shp_1",
          bpost_client_reference: "order_1",
          bpost_label_url: "data:application/pdf;base64,JVBERi0x",
          bpost_label_data: "JVBERi0x",
          bpost_tracking: "323200000000000000",
        },
      },
    ])
  })

  it("ignore un fulfillment hors Bpost", async () => {
    mockRetrieveFulfillment.mockResolvedValue({
      id: "ful_2",
      provider_id: "manual_manual",
      order_id: "order_1",
      data: {},
    })

    await handler({
      event: { data: { id: "ful_2" } },
      container: makeContainer(),
    } as any)

    expect(mockRetrieveOrder).not.toHaveBeenCalled()
    expect(mockUpdateOrders).not.toHaveBeenCalled()
  })

  it("n'écrit rien si l'étiquette auto a été sautée (> 250 €)", async () => {
    mockRetrieveFulfillment.mockResolvedValue({
      id: "ful_3",
      provider_id: "bpost_bpost",
      order_id: "order_1",
      data: { auto_label_skipped: true, reason: "order_above_250_eur" },
    })

    await handler({
      event: { data: { id: "ful_3" } },
      container: makeContainer(),
    } as any)

    expect(mockRetrieveOrder).not.toHaveBeenCalled()
    expect(mockUpdateOrders).not.toHaveBeenCalled()
  })
})
