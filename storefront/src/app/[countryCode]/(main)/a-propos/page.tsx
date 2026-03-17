import { Metadata } from "next"
import Image from "next/image"

const APROPOS_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"

export const metadata: Metadata = {
  title: "À propos de nous | La Cabrade - Sellerie équestre à Fléron",
  description: "Depuis près de 50 ans, La Cabrade accompagne les cavaliers et leurs chevaux avec passion et expertise. Découvrez notre histoire, notre équipe et nos valeurs.",
  alternates: {
    canonical: `${APROPOS_BASE_URL}/be/a-propos`,
  },
}

export default function AProposPage() {
  const teamMembers = [
    {
      name: "MÉLISSA - La boss 😎",
      role: "Direction & sélection",
      description:
        "Mélissa a repris la sellerie en juillet 2022, depuis, elle met tout son cœur dans cette aventure. Toujours à l’écoute et de bon conseil, elle met un point d’honneur à satisfaire les besoins de sa clientèle.",
      accent: "from-pink-100 to-rose-100",
      image: "https://ik.imagekit.io/kodt9cn6f/Cabrade/melissa.webp",
    },
    {
      name: "FLORIANE - L’ultra polyvalente 🤩",
      role: "Conseil & collections",
      description:
        "Floriane vous accueille avec soin et vous conseille avec justesse en magasin. Elle organise et prend part à nos shootings, tout en jouant un rôle clé dans la sélection de nos nouvelles collections.",
      accent: "from-blue-100 to-indigo-100",
      image: "https://ik.imagekit.io/kodt9cn6f/Cabrade/floriane.webp",
    },
    {
      name: "ELENA - La douce 😍",
      role: "Communication & contenu",
      description:
        "Elle est une véritable perle en matière de communication et de création de contenu. Elena sublime nos produits sur les réseaux sociaux grâce à son œil avisé et à sa créativité débordante.",
      accent: "from-green-100 to-emerald-100",
      image: "https://ik.imagekit.io/kodt9cn6f/Cabrade/elena.webp",
    },
    {
      name: "CLARA - La motivée 😁",
      role: "Selle sur-mesure Equipe",
      description:
        "Dernière arrivée, attentive et pleine d’énergie, Clara prend en main notre service de selle-sur-mesure Equipe. Elle vous aidera également à dénicher l’équipement de vos rêves en magasin.",
      accent: "from-amber-100 to-orange-100",
      image: "https://ik.imagekit.io/kodt9cn6f/Cabrade/clara.webp",
    },
    {
      name: "AMÉLIE L. - La discrète 🤓",
      role: "Secrétariat & visuels",
      description:
        "Amélie, notre secrétaire attitrée, veille au bon fonctionnement du bureau au quotidien. Elle met de temps en temps ses compétences créatives au service du magasin en réalisant certains de nos visuels.",
      accent: "from-slate-100 to-gray-100",
      image: "https://ik.imagekit.io/kodt9cn6f/Cabrade/amelie.webp?updatedAt=1773212429228",
    },
    {
      name: "AMÉLIE D. – La suppléante 🤭",
      role: "Conseil & vente",
      description:
        "Professeure de mathématiques en secondaire et cavalière depuis plus de 30 ans, Amélie D. met sa rigueur et son enthousiasme quelques jours par mois au service du magasin. Elle apporte son sens du détail et sa bonne humeur pour que tout soit parfaitement carré, à l'écurie comme en boutique.",
      accent: "from-violet-100 to-purple-100",
      image: "https://ik.imagekit.io/kodt9cn6f/Cabrade/amelied.webp",
    },
  ]

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative bg-white py-20 border-b border-gray-200">
        <div className="content-container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              À propos de nous
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Depuis près de 50 ans, notre sellerie accompagne les cavaliers et leurs chevaux avec passion et expertise. Implantée à Fléron, au cœur de la région liégeoise, notre magasin est devenu une adresse incontournable pour tous les amoureux d&apos;équitation.
            </p>
          </div>
        </div>
      </section>

      {/* Notre Histoire */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Notre histoire
                </h2>
                <div className="prose prose-lg text-gray-600 space-y-4">
                  <p>
                    En juillet 2022, Mélissa a pris la tête de La Cabrade, insufflant une nouvelle dynamique tout en préservant les valeurs qui font notre force depuis des décennies : qualité, service et passion. Épaulée par son papa et entourée d&apos;une équipe engagée, Mélissa veille chaque jour à vous offrir un accueil chaleureux et des conseils personnalisés.
                  </p>
                  <p>
                    Dans cette volonté d&apos;évolution et d&apos;innovation, nous développons également notre propre marque : LC EQUESTRIAN. Pensée par des cavaliers, pour des cavaliers, elle allie technicité, confort, qualité des matières et élégance. À travers LC EQUESTRIAN, nous souhaitons proposer des produits qui répondent réellement à vos besoins, tout en restant abordables.
                  </p>
                  <p>
                    Notre ambition ? Continuer à faire évoluer notre sellerie, en magasin comme en ligne, tout en restant fidèles à notre identité familiale et à la confiance que vous nous accordez depuis tant d&apos;années.
                  </p>
                  <p>
                    Merci de faire partie de notre histoire — et à très bientôt, en boutique ou sur notre site ! 🐴
                  </p>
                </div>
              </div>
              <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src="https://ik.imagekit.io/kodt9cn6f/Cabrade/team.webp"
                  alt="La Cabrade - magasin"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notre Équipe */}
      <section className="py-16 bg-gray-50">
        <div className="content-container">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Notre équipe
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Une équipe passionnée et expérimentée à votre service
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                >
                  <div className={`relative h-64 bg-gradient-to-br ${member.accent}`}>
                    {member.image ? (
                      <Image
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 768px) 33vw, (min-width: 1024px) 25vw, 100vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {member.name}
                    </h3>
                    <p className="text-amber-600 font-medium mb-3">
                      {member.role}
                    </p>
                    <p className="text-sm text-gray-600">
                      {member.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Nos Valeurs */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Nos valeurs
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Ce qui nous anime au quotidien
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Valeur 1 : Passion */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Passion
                </h3>
                <p className="text-sm text-gray-600">
                  L&apos;équitation est notre passion. Nous partageons votre amour des chevaux et comprenons vos besoins.
                </p>
              </div>

              {/* Valeur 2 : Expertise */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Expertise
                </h3>
                <p className="text-sm text-gray-600">
                  Des conseils avisés pour vous aider à choisir l&apos;équipement le plus adapté à votre pratique.
                </p>
              </div>

              {/* Valeur 3 : Proximité */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Proximité
                </h3>
                <p className="text-sm text-gray-600">
                  Un service personnalisé et une relation de confiance avec nos clients.
                </p>
              </div>

              {/* Valeur 4 : Qualité */}
              <div className="text-center">
                <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Qualité
                </h3>
                <p className="text-sm text-gray-600">
                  Nous sélectionnons avec soin des produits durables et fiables des meilleures marques.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Contact / Visite */}
      <section className="py-16 bg-pink-50 border-t border-gray-200">
        <div className="content-container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Venez nous rendre visite
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Notre équipe vous accueille avec plaisir dans notre magasin de Fléron
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <svg className="w-8 h-8 text-amber-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="font-semibold text-gray-900 mb-2">Adresse</h3>
                <p className="text-sm text-gray-600">
                  Rue de la Clef, 96<br />
                  B-4620 Fléron
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <svg className="w-8 h-8 text-amber-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <h3 className="font-semibold text-gray-900 mb-2">Téléphone</h3>
                <p className="text-sm text-gray-600">
                  <a href="tel:+3243586099" className="hover:text-amber-600 transition-colors">
                    +32 (0)4/358.60.99
                  </a>
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <svg className="w-8 h-8 text-amber-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-gray-900 mb-2">Horaires</h3>
                <p className="text-sm text-gray-600">
                  Ma-Ve: 10h-18h<br />
                  Sam: 10h-17h
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}



