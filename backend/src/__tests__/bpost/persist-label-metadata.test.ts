import {
  buildBpostLabelMetadata,
  fieldsFromFulfillmentData,
  persistBpostLabelOnOrder,
} from "../../modules/bpost/persist-label-metadata"

describe("buildBpostLabelMetadata", () => {
  it("retourne null s'il n'y a rien à persister", () => {
    expect(buildBpostLabelMetadata({}, {})).toBeNull()
  })

  it("fusionne les champs Bpost sans perdre les metadata existantes", () => {
    const next = buildBpostLabelMetadata(
      { applied_gift_cards: [{ code: "GC-1" }], bpost_pickup_point: { Id: "PP" } },
      {
        shipmentId: "shp_1",
        clientReference: "order_1",
        labelUrl: "https://labels.example/1.pdf",
        labelData: "JVBERi0x",
        trackingNumber: "323200000000000000",
      }
    )

    expect(next).toEqual({
      applied_gift_cards: [{ code: "GC-1" }],
      bpost_pickup_point: { Id: "PP" },
      bpost_shipment_id: "shp_1",
      bpost_client_reference: "order_1",
      bpost_label_url: "https://labels.example/1.pdf",
      bpost_label_data: "JVBERi0x",
      bpost_tracking: "323200000000000000",
    })
  })

  it("n'écrase pas une étiquette déjà persistée", () => {
    const next = buildBpostLabelMetadata(
      {
        bpost_label_data: "EXISTING",
        bpost_shipment_id: "shp_old",
      },
      {
        shipmentId: "shp_new",
        labelData: "NEW",
      }
    )

    expect(next?.bpost_label_data).toBe("EXISTING")
    expect(next?.bpost_shipment_id).toBe("shp_old")
    expect(next?.bpost_client_reference).toBe("shp_new")
  })

  it("reprend clientReference si shipmentId manque", () => {
    const next = buildBpostLabelMetadata({}, { clientReference: "order_1" })
    expect(next).toEqual({
      bpost_shipment_id: "order_1",
      bpost_client_reference: "order_1",
    })
  })
})

describe("fieldsFromFulfillmentData", () => {
  it("lit les clés renvoyées par createFulfillment", () => {
    expect(
      fieldsFromFulfillmentData({
        shipmentId: "shp_1",
        clientReference: "ref_1",
        label_url: "https://x",
        label_data: "JVBERi0x",
        tracking_number: "3232",
      })
    ).toEqual({
      shipmentId: "shp_1",
      clientReference: "ref_1",
      labelUrl: "https://x",
      labelData: "JVBERi0x",
      trackingNumber: "3232",
    })
  })
})

describe("persistBpostLabelOnOrder", () => {
  it("écrit metadata via updateOrders", async () => {
    const retrieveOrder = jest.fn().mockResolvedValue({
      id: "order_1",
      metadata: { vat_number: "BE0123" },
    })
    const updateOrders = jest.fn().mockResolvedValue([])

    const ok = await persistBpostLabelOnOrder(
      { retrieveOrder, updateOrders },
      "order_1",
      { shipmentId: "shp_1", labelData: "JVBERi0x" }
    )

    expect(ok).toBe(true)
    expect(updateOrders).toHaveBeenCalledWith([
      {
        id: "order_1",
        metadata: {
          vat_number: "BE0123",
          bpost_shipment_id: "shp_1",
          bpost_client_reference: "shp_1",
          bpost_label_data: "JVBERi0x",
        },
      },
    ])
  })

  it("ne touche pas la commande si rien de nouveau", async () => {
    const retrieveOrder = jest.fn().mockResolvedValue({
      id: "order_1",
      metadata: {
        bpost_label_data: "EXISTING",
        bpost_shipment_id: "shp_1",
        bpost_client_reference: "shp_1",
      },
    })
    const updateOrders = jest.fn()

    const ok = await persistBpostLabelOnOrder(
      { retrieveOrder, updateOrders },
      "order_1",
      { shipmentId: "shp_1", labelData: "NEW" }
    )

    expect(ok).toBe(false)
    expect(updateOrders).not.toHaveBeenCalled()
  })
})
