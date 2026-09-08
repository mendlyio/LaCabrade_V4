const mockPutObject = jest.fn().mockResolvedValue(undefined)
const mockRemoveObject = jest.fn().mockResolvedValue(undefined)
const mockGetObject = jest.fn()
const mockBucketExists = jest.fn().mockResolvedValue(true)
const mockSetBucketPolicy = jest.fn().mockResolvedValue(undefined)
const mockMakeBucket = jest.fn().mockResolvedValue(undefined)

jest.mock("minio", () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: mockBucketExists,
    makeBucket: mockMakeBucket,
    setBucketPolicy: mockSetBucketPolicy,
    putObject: mockPutObject,
    removeObject: mockRemoveObject,
    getObject: mockGetObject,
  })),
}))

jest.mock("@medusajs/framework/utils", () => ({
  AbstractFileProviderService: class {
    getIdentifier() {
      return "minio-file"
    }
  },
  MedusaError: class MedusaError extends Error {
    static Types = { INVALID_DATA: "invalid_data", UNEXPECTED_STATE: "unexpected_state" }
    type: string
    constructor(type: string, message: string) {
      super(message)
      this.type = type
    }
  },
}))

import { Readable } from "stream"
import MinioFileProviderService from "../modules/minio-file/service"

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

function createService() {
  return new MinioFileProviderService(
    { logger: logger as any },
    {
      endPoint: "https://bucket-production-de72.up.railway.app",
      accessKey: "ak",
      secretKey: "sk",
      bucket: "medusa-media",
    }
  )
}

describe("MinioFileProviderService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockBucketExists.mockResolvedValue(true)
    mockPutObject.mockResolvedValue(undefined)
    mockRemoveObject.mockResolvedValue(undefined)
  })

  it("upload construit une URL https sans double protocole", async () => {
    const service = createService()
    const result = await service.upload({
      filename: "photo.png",
      mimeType: "image/png",
      content: "hello",
    } as any)

    expect(result.url).toMatch(
      /^https:\/\/bucket-production-de72\.up\.railway\.app\/medusa-media\/photo-/
    )
    expect(result.url).not.toContain("https://https://")
    expect(mockPutObject).toHaveBeenCalled()
    const meta = mockPutObject.mock.calls[0][4]
    expect(meta["Cache-Control"]).toContain("max-age=31536000")
    expect(meta["Content-Type"]).toBe("image/png")
  })

  it("delete accepte un tableau (contrat Medusa 2.8+)", async () => {
    const service = createService()
    await service.delete([
      { fileKey: "a.png" },
      {
        fileKey:
          "https://bucket-production-de72.up.railway.app/medusa-media/odoo/products/x/main.png",
      },
    ])

    expect(mockRemoveObject).toHaveBeenCalledTimes(2)
    expect(mockRemoveObject).toHaveBeenNthCalledWith(
      1,
      "medusa-media",
      "a.png"
    )
    expect(mockRemoveObject).toHaveBeenNthCalledWith(
      2,
      "medusa-media",
      "odoo/products/x/main.png"
    )
  })

  it("getPresignedDownloadUrl retourne l'URL publique stable", async () => {
    const service = createService()
    const url = await service.getPresignedDownloadUrl({
      fileKey: "odoo/products/prod_1/main.png",
    })
    expect(url).toBe(
      "https://bucket-production-de72.up.railway.app/medusa-media/odoo/products/prod_1/main.png"
    )
  })

  it("getAsBuffer lit le flux MinIO", async () => {
    mockGetObject.mockResolvedValue(Readable.from([Buffer.from("abc")]))
    const service = createService()
    const buf = await service.getAsBuffer({ fileKey: "a.png" })
    expect(buf.toString()).toBe("abc")
  })
})
