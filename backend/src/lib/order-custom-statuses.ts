/**
 * États personnalisés d'avancement de commande (back-office Medusa).
 *
 * Indépendants du `order.status` natif Medusa. Stockés dans
 * `order.metadata.custom_status` + historique dans
 * `order.metadata.custom_status_history`.
 *
 * Cette source de vérité est partagée entre le widget admin, l'endpoint API
 * et le template email.
 */

export type OrderCustomStatusId =
  | "recue"
  | "preparation"
  | "prete_expedier"
  | "expediee"
  | "en_point_relais"
  | "dispo_magasin"
  | "retiree"
  | "livree"
  | "probleme"
  | "annulee"

export type OrderCustomStatusContext =
  | "bpost_tracking"   // ajoute le n° de suivi et le lien Bpost
  | "pickup_store"     // ajoute l'adresse du magasin pour retrait
  | "pickup_relais"    // ajoute le nom + adresse du point relais Bpost
  | "issue"            // ton de message "on revient vers vous"
  | "cancellation"     // ton d'annulation
  | "delivered"        // ton de confirmation de livraison
  | "received"         // confirmation réception commande
  | "in_progress"      // ton "on travaille dessus"

export interface OrderCustomStatusDef {
  id: OrderCustomStatusId
  label: string
  description: string
  emailSubject: (displayId: string | number) => string
  emailBody: string
  color: string          // hex, utilisé dans le badge email + admin
  contexts: OrderCustomStatusContext[]
  emailEnabledByDefault: boolean
}

export const ORDER_CUSTOM_STATUSES: OrderCustomStatusDef[] = [
  {
    id: "recue",
    label: "Reçue",
    description: "Commande reçue, en attente de traitement.",
    emailSubject: (id) => `Votre commande #${id} a bien été reçue`,
    emailBody:
      "Merci pour votre commande ! Nous l'avons bien reçue et allons la traiter dans les plus brefs délais.",
    color: "#6b7280",
    contexts: ["received"],
    // Le client reçoit déjà l'email order-placed automatique, pas besoin de doublonner.
    emailEnabledByDefault: false,
  },
  {
    id: "preparation",
    label: "En préparation",
    description: "Votre commande est en cours de préparation.",
    emailSubject: (id) => `Votre commande #${id} est en préparation`,
    emailBody:
      "Bonne nouvelle, nous préparons actuellement votre commande. Vous recevrez un nouvel email dès qu'elle sera prête.",
    color: "#3b82f6",
    contexts: ["in_progress"],
    emailEnabledByDefault: true,
  },
  {
    id: "prete_expedier",
    label: "Prête à expédier",
    description: "Votre commande est emballée et prête à partir.",
    emailSubject: (id) => `Votre commande #${id} est prête à partir`,
    emailBody:
      "Votre commande est emballée et n'attend plus que le passage du transporteur. Nous vous communiquons le numéro de suivi dès qu'il est disponible.",
    color: "#8b5cf6",
    contexts: ["in_progress"],
    emailEnabledByDefault: true,
  },
  {
    id: "expediee",
    label: "Expédiée",
    description: "Votre commande est en route !",
    emailSubject: (id) => `Votre commande #${id} a été expédiée !`,
    emailBody:
      "Votre commande est en route. Vous pouvez suivre son acheminement avec le numéro de suivi ci-dessous.",
    color: "#10b981",
    contexts: ["bpost_tracking"],
    emailEnabledByDefault: true,
  },
  {
    id: "en_point_relais",
    label: "Arrivée au point relais",
    description: "Votre colis vous attend en point relais.",
    emailSubject: (id) => `Votre colis #${id} est arrivé au point relais`,
    emailBody:
      "Votre colis est arrivé au point relais Bpost et vous y attend. Pensez à vous munir d'une pièce d'identité pour le retrait.",
    color: "#f59e0b",
    contexts: ["pickup_relais", "bpost_tracking"],
    emailEnabledByDefault: true,
  },
  {
    id: "dispo_magasin",
    label: "Disponible en magasin",
    description: "Votre commande est prête à être retirée en magasin.",
    emailSubject: (id) => `Votre commande #${id} est prête à être retirée`,
    emailBody:
      "Votre commande est prête, vous pouvez venir la récupérer en magasin aux horaires d'ouverture.",
    color: "#f59e0b",
    contexts: ["pickup_store"],
    emailEnabledByDefault: true,
  },
  {
    id: "retiree",
    label: "Retirée en magasin",
    description: "Votre commande a été retirée.",
    emailSubject: (id) => `Confirmation de retrait de votre commande #${id}`,
    emailBody:
      "Nous confirmons le retrait de votre commande en magasin. Merci pour votre visite et à bientôt à la Sellerie La Cabrade !",
    color: "#059669",
    contexts: ["delivered"],
    emailEnabledByDefault: true,
  },
  {
    id: "livree",
    label: "Livrée",
    description: "Votre commande a été livrée.",
    emailSubject: (id) => `Votre commande #${id} a été livrée`,
    emailBody:
      "Votre commande a été livrée. Nous espérons qu'elle vous plaira ! N'hésitez pas à nous laisser un avis si vous en avez l'envie.",
    color: "#059669",
    contexts: ["delivered"],
    emailEnabledByDefault: true,
  },
  {
    id: "probleme",
    label: "Problème / en attente",
    description: "Un problème nécessite votre attention.",
    emailSubject: (id) => `Votre commande #${id} — information importante`,
    emailBody:
      "Nous rencontrons un imprévu sur votre commande et revenons vers vous très rapidement avec plus de détails. N'hésitez pas à nous contacter en attendant.",
    color: "#f97316",
    contexts: ["issue"],
    emailEnabledByDefault: true,
  },
  {
    id: "annulee",
    label: "Annulée",
    description: "Votre commande a été annulée.",
    emailSubject: (id) => `Votre commande #${id} a été annulée`,
    emailBody:
      "Votre commande a été annulée. Si vous avez réglé en ligne, vous serez remboursé(e) sous quelques jours ouvrables. Pour toute question, contactez-nous.",
    color: "#ef4444",
    contexts: ["cancellation"],
    emailEnabledByDefault: true,
  },
]

const BY_ID = new Map(ORDER_CUSTOM_STATUSES.map((s) => [s.id, s]))

export function getCustomStatusDef(id: string): OrderCustomStatusDef | null {
  return BY_ID.get(id as OrderCustomStatusId) || null
}

export function isValidCustomStatus(id: string): id is OrderCustomStatusId {
  return BY_ID.has(id as OrderCustomStatusId)
}

/**
 * Adresse et horaires du magasin physique La Cabrade — utilisés dans l'email
 * "Disponible en magasin". Centralisés ici pour éviter les duplications.
 */
export const STORE_PICKUP_INFO = {
  name: "Sellerie La Cabrade",
  street: "Rue de la Clef 96",
  postalCode: "4621",
  city: "Retinne",
  country: "Belgique",
  phone: "+32 4 387 50 36",
  email: "contact@sellerie-lacabrade.be",
  hours: [
    { day: "Mardi - Vendredi", hours: "10h00 - 18h00" },
    { day: "Samedi", hours: "10h00 - 17h00" },
    { day: "Dimanche & Lundi", hours: "Fermé" },
  ],
} as const
