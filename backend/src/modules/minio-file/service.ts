import { AbstractFileProviderService, MedusaError } from '@medusajs/framework/utils';
import { Logger } from '@medusajs/framework/types';
import { 
  ProviderUploadFileDTO,
  ProviderDeleteFileDTO,
  ProviderFileResultDTO,
  ProviderGetFileDTO
} from '@medusajs/framework/types';
import { Client } from 'minio';
import path from 'path';
import { ulid } from 'ulid';
import { Readable } from 'stream';
import {
  DEFAULT_MINIO_BUCKET,
  createMinioClient,
  minioObjectMeta,
  minioPublicUrl,
  normalizeMinioFileKey,
  stripMinioProtocol,
} from '../../lib/minio';

type InjectedDependencies = {
  logger: Logger
}

interface MinioServiceConfig {
  endPoint: string
  accessKey: string
  secretKey: string
  bucket?: string
}

export interface MinioFileProviderOptions {
  endPoint: string
  accessKey: string
  secretKey: string
  bucket?: string
}

/**
 * Service to handle file storage using MinIO / Railway Bucket.
 */
class MinioFileProviderService extends AbstractFileProviderService {
  static identifier = 'minio-file'
  protected readonly config_: MinioServiceConfig
  protected readonly logger_: Logger
  protected client: Client
  protected readonly bucket: string
  protected readonly host: string

  constructor({ logger }: InjectedDependencies, options: MinioFileProviderOptions) {
    super()
    this.logger_ = logger
    this.config_ = {
      endPoint: options.endPoint,
      accessKey: options.accessKey,
      secretKey: options.secretKey,
      bucket: options.bucket
    }

    this.bucket = this.config_.bucket || DEFAULT_MINIO_BUCKET
    this.host = stripMinioProtocol(this.config_.endPoint)
    this.logger_.info(`MinIO service initialized with bucket: ${this.bucket}`)
    this.logger_.info(`Initializing MinIO client with endpoint: ${this.host}`)

    this.client = createMinioClient({
      endPoint: this.host,
      accessKey: this.config_.accessKey,
      secretKey: this.config_.secretKey,
      bucket: this.bucket,
    })

    this.initializeBucket().catch(error => {
      this.logger_.error(`Failed to initialize MinIO bucket: ${error.message}`)
      this.logger_.error(`MinIO Configuration: Endpoint=${this.host}, Bucket=${this.bucket}`)
    })
  }

  static validateOptions(options: Record<string, any>) {
    const requiredFields = [
      'endPoint',
      'accessKey',
      'secretKey'
    ]

    requiredFields.forEach((field) => {
      if (!options[field]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${field} is required in the provider's options`
        )
      }
    })
  }

  private publicUrl(fileKey: string): string {
    return minioPublicUrl(this.host, this.bucket, fileKey)
  }

  private fileKey(fileKey: string | undefined): string | null {
    return normalizeMinioFileKey(fileKey, this.bucket, this.host)
  }

  private async initializeBucket(): Promise<void> {
    try {
      const bucketExists = await this.client.bucketExists(this.bucket)
      
      if (!bucketExists) {
        await this.client.makeBucket(this.bucket)
        this.logger_.info(`Created bucket: ${this.bucket}`)
      } else {
        this.logger_.info(`Using existing bucket: ${this.bucket}`)
      }

      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`]
          }
        ]
      }

      try {
        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy))
        this.logger_.info(`Set public read policy for bucket: ${this.bucket}`)
      } catch (policyError) {
        this.logger_.warn(`Failed to update policy for existing bucket: ${policyError.message}`)
      }
    } catch (error) {
      this.logger_.error(`Error initializing bucket: ${error.message}`)
      throw error
    }
  }

  async upload(
    file: ProviderUploadFileDTO
  ): Promise<ProviderFileResultDTO> {
    if (!file) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file provided'
      )
    }

    if (!file.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No filename provided'
      )
    }

    try {
      const parsedFilename = path.parse(file.filename)
      const fileKey = `${parsedFilename.name}-${ulid()}${parsedFilename.ext}`
      const content = Buffer.from(file.content, 'binary')

      await this.client.putObject(
        this.bucket,
        fileKey,
        content,
        content.length,
        minioObjectMeta(file.mimeType, file.filename)
      )

      const url = this.publicUrl(fileKey)

      this.logger_.info(`Successfully uploaded file ${fileKey} to MinIO bucket ${this.bucket}`)

      return {
        url,
        key: fileKey
      }
    } catch (error) {
      this.logger_.error(`Failed to upload file: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to upload file: ${error.message}`
      )
    }
  }

  async delete(
    files: ProviderDeleteFileDTO | ProviderDeleteFileDTO[]
  ): Promise<void> {
    const fileArray = Array.isArray(files) ? files : [files]

    for (const fileData of fileArray) {
      const fileKey = this.fileKey(fileData?.fileKey)
      if (!fileKey) {
        this.logger_.warn('MinIO delete skipped: no file key provided')
        continue
      }

      try {
        await this.client.removeObject(this.bucket, fileKey)
        this.logger_.info(`Successfully deleted file ${fileKey} from MinIO bucket ${this.bucket}`)
      } catch (error) {
        this.logger_.warn(`Failed to delete file ${fileKey}: ${error.message}`)
      }
    }
  }

  async getPresignedDownloadUrl(
    fileData: ProviderGetFileDTO
  ): Promise<string> {
    const fileKey = this.fileKey(fileData?.fileKey)
    if (!fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    // Objects are public-read. Returning the stable HTTPS URL avoids MinIO
    // presign quirks (region / path-style / http:443) that break the admin UI.
    return this.publicUrl(fileKey)
  }

  async getDownloadStream(
    fileData: ProviderGetFileDTO
  ): Promise<Readable> {
    const fileKey = this.fileKey(fileData?.fileKey)
    if (!fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      return await this.client.getObject(this.bucket, fileKey)
    } catch (error) {
      this.logger_.error(`Failed to stream file ${fileKey}: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to stream file: ${error.message}`
      )
    }
  }

  async getAsBuffer(
    fileData: ProviderGetFileDTO
  ): Promise<Buffer> {
    const stream = await this.getDownloadStream(fileData)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
}

export default MinioFileProviderService
