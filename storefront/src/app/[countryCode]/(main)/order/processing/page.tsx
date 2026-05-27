"use client"

import { useSearchParams, useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"

const MAX_POLL_SECONDS = 60
const POLL_INTERVAL_MS = 1200
const INITIAL_POLL_DELAY_MS = 400

export default function OrderProcessingPage() {
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()

  const cartId = searchParams.get("cart_id")
  const countryCode = (params.countryCode as string) || "fr"

  const [elapsed, setElapsed] = useState(0)
  const [failed, setFailed] = useState(false)
  const polling = useRef(true)

  useEffect(() => {
    if (!cartId) {
      router.replace(`/${countryCode}`)
      return
    }

    const start = Date.now()

    const poll = async () => {
      if (!polling.current) return

      try {
        const res = await fetch(`/api/order-by-cart/${cartId}`, {
          method: "POST",
        })
        const data = await res.json()

        if (data?.order?.id) {
          polling.current = false
          const cc = data.order.country_code || countryCode
          router.replace(`/${cc}/order/confirmed/${data.order.id}`)
          return
        }
      } catch {
        // continue polling
      }

      const secondsElapsed = Math.floor((Date.now() - start) / 1000)
      setElapsed(secondsElapsed)

      if (secondsElapsed >= MAX_POLL_SECONDS) {
        polling.current = false
        setFailed(true)
        return
      }

      setTimeout(poll, POLL_INTERVAL_MS)
    }

    const timer = setTimeout(poll, INITIAL_POLL_DELAY_MS)
    return () => {
      polling.current = false
      clearTimeout(timer)
    }
  }, [cartId, countryCode, router])

  if (failed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">
            Traitement en cours
          </h1>
          <p className="text-gray-600 mb-6">
            Votre paiement a bien été reçu mais la confirmation prend plus de temps que prévu.
            Vous recevrez un email de confirmation sous peu.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Si vous ne recevez pas d'email dans les 15 minutes, contactez-nous.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={`/${countryCode}/account`}
              className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
            >
              Voir mes commandes
            </a>
            <a
              href={`/${countryCode}/contact`}
              className="inline-block px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Nous contacter
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-3">
          Paiement en cours de traitement
        </h1>
        <p className="text-gray-600 mb-4">
          Votre paiement a été accepté. Nous finalisons votre commande...
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min((elapsed / MAX_POLL_SECONDS) * 100, 95)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400">
          Veuillez ne pas fermer cette page
        </p>
      </div>
    </div>
  )
}
