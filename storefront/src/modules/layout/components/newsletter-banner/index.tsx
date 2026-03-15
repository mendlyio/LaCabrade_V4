"use client"

import { useState } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://backend-production-7bbb.up.railway.app"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const NewsletterBanner = () => {
  const [email, setEmail] = useState("")
  const [birthday, setBirthday] = useState("")
  const [honeypot, setHoneypot] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Honeypot : succès silencieux si le champ caché est rempli (bot détecté)
    if (honeypot) {
      setStatus("success")
      setMessage("C'est parti ! Ton code -10% t'a été envoyé par email 📬")
      return
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error")
      setMessage("Adresse email invalide")
      return
    }
    if (!birthday) {
      setStatus("error")
      setMessage("Ta date d'anniversaire est requise 🎂")
      return
    }

    setStatus("loading")
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (PUBLISHABLE_KEY) {
        headers["x-publishable-api-key"] = PUBLISHABLE_KEY
      }
      const res = await fetch(`${BACKEND_URL}/store/newsletter`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, birthday, website: honeypot }),
      })
      const data = await res.json()

      if (res.ok || res.status === 200) {
        setStatus("success")
        setMessage(
          data.already_subscribed
            ? "Tu es déjà inscrit(e) — vérifie tes emails 📬"
            : "C'est parti ! Ton code -10% t'a été envoyé par email 📬"
        )
        setEmail("")
        setBirthday("")
        setTimeout(() => {
          setStatus("idle")
          setMessage("")
        }, 8000)
      } else {
        throw new Error(data.message || "Erreur")
      }
    } catch {
      setStatus("error")
      setMessage("Une erreur s'est produite. Réessayez.")
      setTimeout(() => { setStatus("idle"); setMessage("") }, 4000)
    }
  }

  const disabled = status === "loading" || status === "success"

  return (
    <div className="bg-[#9e354a] py-12">
      <div className="content-container">
        <div className="max-w-xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Un petit bonus pour toi !
          </h3>
          <p className="text-white/90 text-lg mb-6">
            Rejoins-nous et économise <strong className="text-white">10%</strong> dès ton inscription
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Honeypot — piège pour les bots */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, width: 0 }}
            />

            {/* 1. Email */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ton adresse email"
              required
              disabled={disabled}
              className="w-full px-5 py-4 rounded-lg text-gray-900 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-white
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* 2. Anniversaire */}
            <div className="flex flex-col gap-1">
              <label className="text-white/80 text-xs font-medium text-left ml-1 flex items-center gap-1">
                🎂 Date d&apos;anniversaire
                <span className="text-white/50 font-normal">(obligatoire)</span>
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                required
                disabled={disabled}
                className={`w-auto px-4 py-3 rounded-lg text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-white
                           disabled:opacity-50 text-sm ${
                  status === "error" && !birthday
                    ? "ring-2 ring-red-300"
                    : ""
                }`}
                style={{ colorScheme: "light" }}
              />
            </div>

            {/* 3. Bouton */}
            <button
              type="submit"
              disabled={disabled}
              className="w-full px-8 py-4 bg-white text-amber-600 font-semibold rounded-lg
                         hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Inscription..." : status === "success" ? "✓ Inscrit(e)" : "S'inscrire"}
            </button>
          </form>

          {message && (
            <div className={`mt-4 text-sm font-medium ${status === "success" ? "text-white" : "text-red-100"}`}>
              {message}
            </div>
          )}

          <p className="text-white/60 text-xs mt-4">
            En t&apos;inscrivant tu acceptes nos offres exclusives · Code à usage unique · Désinscription en 1 clic
          </p>
        </div>
      </div>
    </div>
  )
}

export default NewsletterBanner
