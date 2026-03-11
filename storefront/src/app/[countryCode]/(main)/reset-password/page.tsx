"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, Suspense } from "react"
import Input from "@modules/common/components/input"
import ErrorMessage from "@modules/checkout/components/error-message"
import { resetPasswordWithToken } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const email = searchParams.get("email") ?? ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lien invalide</h1>
          <p className="text-gray-600 mb-6">
            Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.
          </p>
          <LocalizedClientLink
            href="/account"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
          >
            Retour à la connexion
          </LocalizedClientLink>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Mot de passe mis à jour</h1>
          <p className="text-gray-600 mb-6">
            Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.
          </p>
          <LocalizedClientLink
            href="/account"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
          >
            Se connecter
          </LocalizedClientLink>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    const err = await resetPasswordWithToken(token, email, password)
    setLoading(false)

    if (err) {
      setError(err)
    } else {
      setSuccess(true)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h1>
            <p className="text-sm text-gray-600">
              Choisissez un nouveau mot de passe pour votre compte.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <Input
              label="Confirmer le mot de passe"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />

            <ErrorMessage error={error} />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg"
            >
              {loading ? "En cours..." : "Réinitialiser le mot de passe"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <LocalizedClientLink href="/account" className="text-amber-600 hover:text-amber-700">
              ← Retour à la connexion
            </LocalizedClientLink>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
