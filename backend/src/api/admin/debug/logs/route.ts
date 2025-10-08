import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

/**
 * GET /admin/debug/logs
 * Retourne les derniers logs du serveur
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    const lines = parseInt(req.query.lines as string) || 100
    
    // Lire les logs depuis stdout/stderr si disponible
    // Ou depuis le fichier de log si configuré
    const { stdout } = await execAsync(`tail -n ${lines} /tmp/medusa-dev.log 2>/dev/null || echo "No logs found"`)
    
    return res.json({
      logs: stdout.split('\n'),
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
      logs: []
    })
  }
}

