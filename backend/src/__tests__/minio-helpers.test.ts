import {
  ensureAbsoluteHttpUrl,
  minioPublicUrl,
  normalizeMinioFileKey,
  stripMinioProtocol,
} from "../lib/minio"

describe("minio URL helpers", () => {
  it("strip le protocole et les slashes finaux", () => {
    expect(stripMinioProtocol("https://bucket.up.railway.app/")).toBe(
      "bucket.up.railway.app"
    )
    expect(stripMinioProtocol("http://bucket.up.railway.app")).toBe(
      "bucket.up.railway.app"
    )
    expect(stripMinioProtocol("bucket.up.railway.app")).toBe(
      "bucket.up.railway.app"
    )
  })

  it("construit une URL publique https même si l'endpoint a déjà un protocole", () => {
    expect(
      minioPublicUrl(
        "https://bucket-production-de72.up.railway.app",
        "medusa-media",
        "odoo/products/prod_1/main.png"
      )
    ).toBe(
      "https://bucket-production-de72.up.railway.app/medusa-media/odoo/products/prod_1/main.png"
    )
  })

  it("normalise une clé brute, un chemin bucket/key, et une URL complète", () => {
    const bucket = "medusa-media"
    const endpoint = "bucket-production-de72.up.railway.app"
    const raw = "odoo/products/prod_1/main.png"

    expect(normalizeMinioFileKey(raw, bucket, endpoint)).toBe(raw)
    expect(
      normalizeMinioFileKey(`${bucket}/${raw}`, bucket, endpoint)
    ).toBe(raw)
    expect(
      normalizeMinioFileKey(
        `https://${endpoint}/${bucket}/${raw}`,
        bucket,
        endpoint
      )
    ).toBe(raw)
  })

  it("retourne null pour une clé vide", () => {
    expect(normalizeMinioFileKey("", "medusa-media")).toBeNull()
    expect(normalizeMinioFileKey(undefined, "medusa-media")).toBeNull()
  })
})

describe("ensureAbsoluteHttpUrl", () => {
  it("préfixe https pour un hostname Railway sans protocole", () => {
    expect(
      ensureAbsoluteHttpUrl("backend-production-7bbb.up.railway.app")
    ).toBe("https://backend-production-7bbb.up.railway.app")
  })

  it("conserve http(s) existant", () => {
    expect(ensureAbsoluteHttpUrl("https://example.com")).toBe(
      "https://example.com"
    )
    expect(ensureAbsoluteHttpUrl("http://localhost:9000")).toBe(
      "http://localhost:9000"
    )
  })

  it("préfixe http pour localhost", () => {
    expect(ensureAbsoluteHttpUrl("localhost:9000")).toBe(
      "http://localhost:9000"
    )
  })

  it("utilise le fallback si vide", () => {
    expect(ensureAbsoluteHttpUrl(undefined)).toBe("http://localhost:9000")
    expect(ensureAbsoluteHttpUrl("")).toBe("http://localhost:9000")
  })
})
