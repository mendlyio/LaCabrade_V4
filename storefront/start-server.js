#!/usr/bin/env node
/**
 * Démarrage storefront Railway (2 Go cgroup).
 *
 * Même contrainte que le backend : --max-old-space-size=2048 + sharp/AVIF
 * (buffers natifs) → SIGKILL 137. On laisse ~500 Mo hors heap V8.
 * OMP_NUM_THREADS=1 limite le parallélisme libvips sans changer les images.
 */
const { spawn } = require("child_process")

const DEFAULT_HEAP_MB = 1536
let nodeOptions = process.env.NODE_OPTIONS || ""
const explicitHeap = process.env.NODE_MAX_OLD_SPACE_SIZE
const existingHeapMatch = nodeOptions.match(/--max-old-space-size=(\d+)/)
let heapMb = explicitHeap
  ? Number(explicitHeap)
  : existingHeapMatch
    ? Number(existingHeapMatch[1])
    : DEFAULT_HEAP_MB
if (!Number.isFinite(heapMb) || heapMb <= 0) {
  heapMb = DEFAULT_HEAP_MB
}
if (!explicitHeap && heapMb >= 2048) {
  heapMb = DEFAULT_HEAP_MB
}
if (existingHeapMatch) {
  nodeOptions = nodeOptions.replace(
    /--max-old-space-size=\d+/,
    `--max-old-space-size=${heapMb}`
  )
} else {
  nodeOptions = `${nodeOptions} --max-old-space-size=${heapMb}`.trim()
}
process.env.NODE_OPTIONS = nodeOptions
if (!process.env.OMP_NUM_THREADS) {
  process.env.OMP_NUM_THREADS = "1"
}

console.log(`   Storefront Node memory limit: ${heapMb} MB`)

const proc = spawn("npx", ["next", "start"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
})

proc.on("error", (error) => {
  console.error("Failed to start Next.js:", error)
  process.exit(1)
})

proc.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Next.js exited via signal ${signal}`)
    process.exit(1)
  }
  process.exit(code ?? 1)
})
