"use client"

import { useState } from "react"

const NewsletterBanner = () => {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    try {
      // Ici, vous pourrez intégrer votre service de newsletter (Mailchimp, Sendinblue, etc.)
      // Pour l'instant, on simule juste un succès
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setStatus("success")
      setMessage("Merci ! Vous êtes inscrit(e) à notre newsletter.")
      setEmail("")
      
      // Réinitialiser après 3 secondes
      setTimeout(() => {
        setStatus("idle")
        setMessage("")
      }, 3000)
    } catch (error) {
      setStatus("error")
      setMessage("Une erreur s'est produite. Veuillez réessayer.")
      
      setTimeout(() => {
        setStatus("idle")
        setMessage("")
      }, 3000)
    }
  }

  return (
    <div className="bg-gradient-to-r from-amber-600 to-orange-600 py-12">
      <div className="content-container">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Inscris-toi à notre newsletter
          </h3>
          <p className="text-amber-50 text-lg mb-6">
            Et bénéficie de <strong className="text-white">5% de réduction</strong> sur ta prochaine commande
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ton adresse email"
              required
              disabled={status === "loading" || status === "success"}
              className="flex-1 px-6 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className="px-8 py-4 bg-white text-amber-600 font-semibold rounded-lg hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === "loading" ? "Inscription..." : status === "success" ? "✓ Inscrit(e)" : "S'inscrire"}
            </button>
          </form>
          
          {message && (
            <p className={`mt-4 text-sm font-medium ${
              status === "success" ? "text-white" : "text-red-100"
            }`}>
              {message}
            </p>
          )}
          
          <p className="text-amber-100 text-sm mt-4">
            En t'inscrivant, tu acceptes de recevoir nos offres exclusives et actualités.
          </p>
        </div>
      </div>
    </div>
  )
}

export default NewsletterBanner

