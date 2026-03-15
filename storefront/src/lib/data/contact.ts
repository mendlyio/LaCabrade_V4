"use server"

import { sdk } from "@lib/config"

export async function sendContactEmail(
  _currentState: unknown,
  formData: FormData
) {
  const firstName = formData.get("first_name") as string
  const lastName = formData.get("last_name") as string
  const email = formData.get("email") as string
  const phone = formData.get("phone") as string
  const subject = formData.get("subject") as string
  const message = formData.get("message") as string
  const website = formData.get("website") as string

  // Honeypot : succès silencieux si le champ caché est rempli (bot détecté)
  if (website) return null

  if (!firstName || !lastName || !email || !subject || !message) {
    return "Veuillez remplir tous les champs obligatoires."
  }

  // Validation email basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return "Veuillez entrer une adresse email valide."
  }

  try {
    // Appeler l'API route pour envoyer l'email
    const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        subject,
        message,
        website: website || "",
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Erreur lors de l'envoi du message:", error)
      if (response.status === 429) {
        return error.message || "Trop de messages envoyés. Veuillez réessayer dans 1 heure."
      }
      return "Une erreur est survenue lors de l'envoi du message. Veuillez réessayer."
    }

    return null // Success
  } catch (error) {
    console.error("Erreur lors de l'envoi du message:", error)
    return "Une erreur est survenue lors de l'envoi du message. Veuillez réessayer."
  }
}

