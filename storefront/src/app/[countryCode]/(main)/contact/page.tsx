import { Metadata } from "next"
import ContactForm from "@modules/contact/components/contact-form"

export const metadata: Metadata = {
  title: "Nous contacter - La Cabrade",
  description: "Besoin d'aide ? Contactez-nous par téléphone ou via notre formulaire de contact. Notre équipe est à votre disposition.",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="max-w-3xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                💬 Service Client
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Nous sommes là pour vous aider
            </h1>
            <p className="text-white/90 text-lg">
              Une question sur nos produits ? Un conseil technique ? Notre équipe de passionnés est à votre écoute.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informations de contact */}
          <div className="lg:col-span-1 space-y-6">
            {/* Téléphone */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Par téléphone</h3>
              <a 
                href="tel:+3243586099"
                className="text-amber-600 hover:text-amber-700 font-semibold text-lg block mb-2"
              >
                +32 (0)4/358.60.99
              </a>
              <p className="text-sm text-gray-600">
                Du mardi au vendredi<br />
                10h - 18h<br />
                Samedi 10h - 17h
              </p>
            </div>

            {/* Adresse */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Notre magasin</h3>
              <p className="text-gray-600">
                Rue de la Clef, 96<br />
                B-4620 Fléron<br />
                <span className="text-sm text-gray-500 mt-2 block">Près de Liège, Belgique</span>
              </p>
            </div>

            {/* Horaires */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Horaires d'ouverture</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Lundi :</strong> Fermé</p>
                <p><strong>Mardi - Vendredi :</strong> 10h - 18h</p>
                <p><strong>Samedi :</strong> 10h - 17h</p>
                <p><strong>Dimanche :</strong> Fermé</p>
              </div>
            </div>

            {/* Réseaux sociaux */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Suivez-nous</h3>
              <div className="flex gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-white border-2 border-amber-300 hover:bg-amber-600 hover:border-amber-600 flex items-center justify-center text-gray-600 hover:text-white transition-all duration-200 hover:scale-110"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-white border-2 border-amber-300 hover:bg-amber-600 hover:border-amber-600 flex items-center justify-center text-gray-600 hover:text-white transition-all duration-200 hover:scale-110"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Formulaire de contact */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Envoyez-nous un message
                </h2>
                <p className="text-gray-600">
                  Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.
                </p>
              </div>
              
              <ContactForm />
            </div>
          </div>
        </div>

        {/* FAQ rapide */}
        <div className="mt-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            ❓ Questions fréquentes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Délais de livraison</h3>
              <p className="text-sm text-gray-600">
                Livraison standard en 3-5 jours ouvrés. Livraison express disponible.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Retours et échanges</h3>
              <p className="text-sm text-gray-600">
                Retours gratuits sous 30 jours. Produits non portés avec étiquettes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Paiement sécurisé</h3>
              <p className="text-sm text-gray-600">
                CB, PayPal, Bancontact. Vos données sont protégées.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Garantie produits</h3>
              <p className="text-sm text-gray-600">
                Tous nos produits sont garantis. Contactez-nous pour plus d'infos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

