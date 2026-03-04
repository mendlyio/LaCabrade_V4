import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

interface ContactRequestBody {
  first_name: string
  last_name: string
  email: string
  phone?: string
  subject: string
  message: string
}

export async function POST(
  req: MedusaRequest<ContactRequestBody>,
  res: MedusaResponse
): Promise<void> {
  const { first_name, last_name, email, phone, subject, message } = req.body

  // Validation
  if (!first_name || !last_name || !email || !subject || !message) {
    res.status(400).json({
      message: "Veuillez remplir tous les champs obligatoires."
    })
    return
  }

  try {
    const notificationModuleService = req.scope.resolve(Modules.NOTIFICATION)

    // Mapper le sujet en français
    const subjectMap: Record<string, string> = {
      "question-produit": "Question sur un produit",
      "commande": "Question sur une commande",
      "retour": "Demande de retour / échange",
      "conseil": "Demande de conseil",
      "autre": "Autre demande"
    }

    const subjectLabel = subjectMap[subject] || subject

    // Préparer le contenu de l'email pour l'équipe
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #d97706 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">💬 Nouveau message de contact</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #111827; font-size: 18px; margin-top: 0;">Informations du contact</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Nom complet:</td>
                <td style="padding: 8px 0; color: #111827;">${first_name} ${last_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0; color: #111827;"><a href="mailto:${email}" style="color: #d97706;">${email}</a></td>
              </tr>
              ${phone ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Téléphone:</td>
                <td style="padding: 8px 0; color: #111827;"><a href="tel:${phone}" style="color: #d97706;">${phone}</a></td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Sujet:</td>
                <td style="padding: 8px 0; color: #111827;"><strong>${subjectLabel}</strong></td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="color: #111827; font-size: 16px; margin-top: 0;">Message</h3>
            <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</div>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #d97706; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>⚡ Action requise:</strong> Répondez à ce client dans les plus brefs délais à l'adresse: <a href="mailto:${email}" style="color: #d97706;">${email}</a>
            </p>
          </div>
        </div>

        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>La Cabrade - LC•EQUESTRIAN</p>
          <p>Rue de la Clef, 96 - B-4620 Fléron</p>
        </div>
      </div>
    `

    // Envoyer l'email à l'équipe via Resend
    await notificationModuleService.createNotifications({
      to: process.env.CONTACT_EMAIL || "contact@sellerie-lacabrade.be",
      channel: "email",
      template: "contact-form",
      data: {
        subject: `[Contact] ${subjectLabel} - ${first_name} ${last_name}`,
        html: emailContent,
      },
    })

    // Envoyer un email de confirmation au client
    const confirmationEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #d97706 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">✅ Message bien reçu !</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="color: #111827; font-size: 16px; line-height: 1.6;">
            Bonjour <strong>${first_name}</strong>,
          </p>
          
          <p style="color: #374151; line-height: 1.6;">
            Nous avons bien reçu votre message concernant : <strong>${subjectLabel}</strong>
          </p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; font-style: italic;">
              "${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"
            </p>
          </div>

          <p style="color: #374151; line-height: 1.6;">
            Notre équipe vous répondra dans les <strong>24 à 48 heures</strong>. 
          </p>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Besoin d'une réponse plus rapide ?</strong><br>
              Appelez-nous au <a href="tel:+3243586099" style="color: #d97706; text-decoration: none; font-weight: 600;">+32 (0)4/358.60.99</a><br>
              Du mardi au vendredi : 10h - 18h | Samedi : 10h - 17h
            </p>
          </div>

          <p style="color: #374151; line-height: 1.6;">
            À très bientôt,<br>
            <strong>L'équipe La Cabrade</strong>
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 5px 0;">La Cabrade - LC•EQUESTRIAN</p>
          <p style="margin: 5px 0;">Sellerie équestre à Fléron, près de Liège</p>
          <p style="margin: 5px 0;">Rue de la Clef, 96 - B-4620 Fléron</p>
          <div style="margin-top: 15px;">
            <a href="https://facebook.com" style="color: #d97706; text-decoration: none; margin: 0 10px;">Facebook</a>
            <a href="https://instagram.com" style="color: #d97706; text-decoration: none; margin: 0 10px;">Instagram</a>
          </div>
        </div>
      </div>
    `

    await notificationModuleService.createNotifications({
      to: email,
      channel: "email",
      template: "contact-confirmation",
      data: {
        subject: `Confirmation de réception - ${subjectLabel}`,
        html: confirmationEmail,
      },
    })

    res.status(200).json({
      message: "Message envoyé avec succès"
    })
  } catch (error) {
    console.error("Erreur lors de l'envoi du message de contact:", error)
    res.status(500).json({
      message: "Une erreur est survenue lors de l'envoi du message"
    })
  }
}

