"use client"

import { useState } from "react"
import { useFormState } from "react-dom"
import Input from "@modules/common/components/input"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import ErrorMessage from "@modules/checkout/components/error-message"
import { sendContactEmail } from "@lib/data/contact"

const ContactForm = () => {
  const [message, formAction] = useFormState(sendContactEmail, null)
  const [success, setSuccess] = useState(false)

  return (
    <form 
      action={async (formData) => {
        setSuccess(false)
        const result = await formAction(formData)
        if (!result) {
          setSuccess(true)
          // Reset form
          const form = document.getElementById('contact-form') as HTMLFormElement
          form?.reset()
        }
      }} 
      id="contact-form"
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Prénom"
          name="first_name"
          type="text"
          required
          autoComplete="given-name"
        />
        <Input
          label="Nom"
          name="last_name"
          type="text"
          required
          autoComplete="family-name"
        />
      </div>

      <Input
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
      />

      <Input
        label="Téléphone (optionnel)"
        name="phone"
        type="tel"
        autoComplete="tel"
      />

      <div className="flex flex-col w-full">
        <label htmlFor="subject" className="mb-2 text-sm font-medium text-gray-700">
          Sujet <span className="text-rose-500">*</span>
        </label>
        <select
          id="subject"
          name="subject"
          required
          className="pt-3 pb-3 block w-full px-4 bg-ui-bg-field border rounded-md appearance-none focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active border-ui-border-base hover:bg-ui-bg-field-hover"
        >
          <option value="">Sélectionnez un sujet</option>
          <option value="question-produit">Question sur un produit</option>
          <option value="commande">Ma commande</option>
          <option value="retour">Retour / Échange</option>
          <option value="conseil">Demande de conseil</option>
          <option value="autre">Autre</option>
        </select>
      </div>

      <div className="flex flex-col w-full">
        <label htmlFor="message" className="mb-2 text-sm font-medium text-gray-700">
          Message <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder="Décrivez votre demande en détail..."
          className="pt-3 pb-3 block w-full px-4 bg-ui-bg-field border rounded-md appearance-none focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active border-ui-border-base hover:bg-ui-bg-field-hover resize-none"
        />
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            ✓
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">Message envoyé avec succès !</p>
            <p className="text-sm text-green-700 mt-1">
              Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.
            </p>
          </div>
        </div>
      )}

      <ErrorMessage error={message} />

      <SubmitButton className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
        📧 Envoyer le message
      </SubmitButton>

      <p className="text-xs text-gray-500 text-center">
        En envoyant ce formulaire, vous acceptez que nous utilisions vos données pour vous répondre. 
        Vos informations ne seront jamais partagées avec des tiers.
      </p>
    </form>
  )
}

export default ContactForm

