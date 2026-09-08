import { Client } from "minio"

export const DEFAULT_MINIO_BUCKET = "medusa-media"

/** Railway rate-limits the bucket; long cache avoids re-fetch storms from the admin dashboard. */
export const MINIO_CACHE_CONTROL = "public, max-age=31536000, immutable"

export type MinioEnvConfig = {
  endPoint: string
  accessKey: string
  secretKey: string
  bucket?: string
}

/**
 * Railway/MinIO endpoints are often stored with or without `https://`.
 * The MinIO SDK wants a hostname; public URLs must always be https.
 */
export function stripMinioProtocol(endPoint: string): string {
  return endPoint.replace(/^https?:\/\//i, "").replace(/\/+$/, "")
}

export function minioPublicUrl(
  endPoint: string,
  bucket: string,
  fileKey: string
): string {
  const host = stripMinioProtocol(endPoint)
  const key = fileKey.replace(/^\/+/, "")
  return `https://${host}/${bucket}/${key}`
}

/**
 * Medusa 2.10 passes file keys as:
 *  - raw object names (`photo-01H….png`, `odoo/products/…/main.png`)
 *  - sometimes a full public URL
 *  - sometimes `{bucket}/{key}`
 */
export function normalizeMinioFileKey(
  fileKey: string | undefined | null,
  bucket: string,
  endPoint?: string
): string | null {
  if (!fileKey || typeof fileKey !== "string") return null
  let key = fileKey.trim()
  if (!key) return null

  try {
    if (/^https?:\/\//i.test(key)) {
      const url = new URL(key)
      key = decodeURIComponent(url.pathname.replace(/^\/+/, ""))
    }
  } catch {
    return null
  }

  const bucketPrefix = `${bucket}/`
  if (key.startsWith(bucketPrefix)) {
    key = key.slice(bucketPrefix.length)
  }

  if (endPoint) {
    const host = stripMinioProtocol(endPoint)
    if (key.startsWith(`${host}/`)) {
      key = key.slice(host.length + 1)
      if (key.startsWith(bucketPrefix)) {
        key = key.slice(bucketPrefix.length)
      }
    }
  }

  key = key.replace(/^\/+/, "")
  return key || null
}

export function minioObjectMeta(mimeType?: string, originalFilename?: string) {
  const meta: Record<string, string> = {
    "Cache-Control": MINIO_CACHE_CONTROL,
    "x-amz-acl": "public-read",
  }
  if (mimeType) {
    meta["Content-Type"] = mimeType
  }
  if (originalFilename) {
    meta["x-amz-meta-original-filename"] = originalFilename
  }
  return meta
}

export function createMinioClient(config: MinioEnvConfig): Client {
  const endPoint = stripMinioProtocol(config.endPoint)
  return new Client({
    endPoint,
    port: 443,
    useSSL: true,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  })
}

export function createMinioClientFromEnv(): {
  client: Client
  endPoint: string
  bucket: string
} | null {
  const endPoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  if (!endPoint || !accessKey || !secretKey) {
    return null
  }
  const bucket = process.env.MINIO_BUCKET || DEFAULT_MINIO_BUCKET
  return {
    client: createMinioClient({ endPoint, accessKey, secretKey, bucket }),
    endPoint: stripMinioProtocol(endPoint),
    bucket,
  }
}

/**
 * Ensure a public URL has a protocol. Railway's RAILWAY_PUBLIC_DOMAIN_VALUE is
 * often a bare hostname, which the Medusa admin SDK cannot use as baseUrl.
 */
export function ensureAbsoluteHttpUrl(
  url: string | undefined | null,
  fallback = "http://localhost:9000"
): string {
  if (!url) return fallback
  const trimmed = url.trim()
  if (!trimmed) return fallback
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/(^localhost)|(^127\.)|(^0\.0\.0\.0)/i.test(trimmed)) {
    return `http://${trimmed}`
  }
  return `https://${trimmed}`
}
