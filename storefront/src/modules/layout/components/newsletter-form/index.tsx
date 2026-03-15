"use client"

import { useState } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://backend-production-7bbb.up.railway.app"

const NewsletterForm = () => {
  const [email, setEmail] = useState("")
  const [birthday, setBirthday] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [promoCode, setPromoCode] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      setStatus("error")
      setMessage("Veuillez entrer une adresse email valide")
      return
    }

    setStatus("loading")

    try {
      const res = await fetch(`${BACKEND_URL}/store/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(birthday ? { birthday } : {}),
        }),
      })

      const data = await res.json()

      if (res.ok || res.status === 200) {
        setStatus("success")
        setPromoCode(data.promo_code || null)
        setMessage(
          data.already_subscribed
            ? "Vous êtes déjà inscrit(e) 🎉 Vérifiez vos emails pour votre code."
            : "Merci ! Votre code -10% vous a été envoyé par email 🎉"
        )
        setEmail("")
        setBirthday("")
        setTimeout(() => {
          setStatus("idle")
          setMessage("")
          setPromoCode(null)
        }, 8000)
      } else {
        throw new Error(data.message || "Erreur inconnue")
      }
    } catch (error: any) {
      setStatus("error")
      setMessage("Une erreur s'est produite. Veuillez réessayer.")
      setTimeout(() => {
        setStatus("idle")
        setMessage("")
      }, 5000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              disabled={status === "loading" || status === "success"}
              className="w-full px-6 py-4 rounded-lg border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-amber-200 focus:outline-none focus:border-white focus:bg-white/20 transition-all disabled:opacity-60"
            />
            {status === "loading" && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="px-8 py-4 bg-white text-amber-600 font-bold rounded-lg hover:bg-amber-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 transform shadow-lg hover:shadow-xl"
          >
            {status === "loading" ? "Inscription..." : status === "success" ? "✓ Inscrit !" : "S'inscrire"}
          </button>
        </div>

        {/* Champ anniversaire optionnel */}
        <div className="flex flex-col gap-1">
          <label className="text-white/70 text-xs font-medium ml-1">
            🎂 Date d'anniversaire <span className="opacity-60">(optionnel — pour recevoir un cadeau le jour J)</span>
          </label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            disabled={status === "loading" || status === "success"}
            className="w-full sm:w-56 px-4 py-3 rounded-lg border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:border-white focus:bg-white/20 transition-all disabled:opacity-60 text-sm"
            style={{ colorScheme: "dark" }}
          />
        </div>
      </form>

      {message && (
        <div
          className={`mt-4 p-4 rounded-lg text-sm font-medium text-center animate-fade-in ${
            status === "success"
              ? "bg-green-500/20 border border-green-300 text-white"
              : "bg-red-500/20 border border-red-300 text-white"
          }`}
        >
          {message}
          {promoCode && status === "success" && (
            <div className="mt-2">
              <span className="text-white/80 text-xs">Votre code : </span>
              <code className="bg-white/20 text-white font-mono font-bold text-base px-3 py-1 rounded ml-1 tracking-widest">
                {promoCode}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NewsletterForm
