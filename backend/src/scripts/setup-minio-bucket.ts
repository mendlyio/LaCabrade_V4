import { Client } from 'minio'

/**
 * Script pour configurer le bucket MinIO avec accès public en lecture
 * Usage: npx ts-node src/scripts/setup-minio-bucket.ts
 */
async function setupMinioBucket() {
  const endpoint = process.env.MINIO_ENDPOINT?.replace(/^https?:\/\//, '')
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const bucket = process.env.MINIO_BUCKET || 'medusa-media'

  if (!endpoint || !accessKey || !secretKey) {
    console.error('❌ Variables MinIO manquantes:')
    console.error(`MINIO_ENDPOINT: ${endpoint ? '✓' : '✗'}`)
    console.error(`MINIO_ACCESS_KEY: ${accessKey ? '✓' : '✗'}`)
    console.error(`MINIO_SECRET_KEY: ${secretKey ? '✓' : '✗'}`)
    process.exit(1)
  }

  console.log(`🔧 Configuration du bucket MinIO: ${bucket}`)
  console.log(`📡 Endpoint: ${endpoint}`)

  const client = new Client({
    endPoint: endpoint,
    port: 443,
    useSSL: true,
    accessKey,
    secretKey,
  })

  try {
    // Vérifier si le bucket existe
    const bucketExists = await client.bucketExists(bucket)
    if (!bucketExists) {
      console.log(`📦 Création du bucket: ${bucket}`)
      await client.makeBucket(bucket, 'us-east-1')
    } else {
      console.log(`✓ Bucket existe: ${bucket}`)
    }

    // Policy pour autoriser la lecture publique
    const publicReadPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    }

    console.log(`🔓 Configuration de la policy publique...`)
    await client.setBucketPolicy(bucket, JSON.stringify(publicReadPolicy))
    
    console.log(`✅ Bucket configuré avec succès !`)
    console.log(`🌐 Les images seront accessibles publiquement`)
    
  } catch (error: any) {
    console.error(`❌ Erreur:`, error.message)
    process.exit(1)
  }
}

setupMinioBucket()

