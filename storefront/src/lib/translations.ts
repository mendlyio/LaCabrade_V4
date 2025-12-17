export const translations = {
  fr: {
    // Header & Navigation
    "nav.menu": "Menu",
    "nav.nouveautes": "Nouveautés",
    "nav.outlet": "Outlet",
    "nav.bon_cadeau": "Bon cadeau",
    "nav.marques": "Marques",
    "nav.a_propos": "À Propos",
    "nav.accueil": "Accueil",
    "nav.search_placeholder": "Rechercher un produit...",
    "nav.my_account": "Mon compte",
    "nav.cart": "Panier",
    "nav.wishlist": "Liste de souhaits",
    
    // Top Bar
    "topbar.promo": "-10% pour les nouveaux clients avec le code BIENVENUE10 | Livraison gratuite dès 100€",
    
    // Footer & Pages
    "footer.about": "À propos",
    "footer.contact": "Contact",
    "footer.faq": "FAQ",
    "footer.cgv": "CGV",
    "footer.legal": "Mentions légales",
    "footer.privacy": "Confidentialité",
    "footer.cookies": "Cookies",
    
    // Checkout
    "checkout.title": "Finaliser ma commande",
    "checkout.shipping": "Livraison",
    "checkout.payment": "Paiement",
    "checkout.review": "Vérification",
    "checkout.complete": "Commander",
    "checkout.subtotal": "Sous-total",
    "checkout.shipping_cost": "Frais de livraison",
    "checkout.total": "Total",
    "checkout.discount": "Remise",
    "checkout.shipping_address": "Adresse de livraison",
    "checkout.billing_address": "Adresse de facturation",
    "checkout.edit": "Modifier",
    "checkout.continue_to_delivery": "Continuer vers la livraison →",
    "checkout.first_name": "Prénom",
    "checkout.last_name": "Nom",
    "checkout.address": "Adresse",
    "checkout.company": "Société",
    "checkout.postal_code": "Code postal",
    "checkout.city": "Ville",
    "checkout.country": "Pays",
    "checkout.province": "Province / État",
    "checkout.email": "Email",
    "checkout.phone": "Téléphone",
    "checkout.billing_same_as_shipping": "Adresse de facturation identique à l'adresse de livraison",
    
    // Bpost pickup
    "bpost.title": "Choisir un point relais Bpost",
    "bpost.search": "Rechercher",
    "bpost.postal_code": "Code postal",
    "bpost.search_placeholder": "Rechercher un point relais...",
    "bpost.selected": "Sélectionné",
    "bpost.no_results": "Aucun point relais trouvé pour ce code postal.",
    "bpost.no_search_results": "Aucun point relais ne correspond à votre recherche.",
    
    // Common
    "common.edit": "Modifier",
    "common.add_to_cart": "Ajouter au panier",
    "common.buy_now": "Acheter maintenant",
    "common.out_of_stock": "Rupture de stock",
    "common.in_stock": "En stock",
    "common.price": "Prix",
    "common.quantity": "Quantité",
    "common.continue_shopping": "Continuer mes achats",
    "common.view_cart": "Voir le panier",
    "cart.title": "Mon panier",
    "cart.item": "Article",
    "cart.quantity": "Quantité",
    "cart.price": "Prix",
    "cart.total": "Total",
  },
  nl: {
    // Header & Navigation
    "nav.menu": "Menu",
    "nav.nouveautes": "Nieuw",
    "nav.outlet": "Outlet",
    "nav.bon_cadeau": "Cadeaubon",
    "nav.marques": "Merken",
    "nav.a_propos": "Over ons",
    "nav.accueil": "Home",
    "nav.search_placeholder": "Zoek een product...",
    "nav.my_account": "Mijn account",
    "nav.cart": "Winkelwagen",
    "nav.wishlist": "Verlanglijst",
    
    // Top Bar
    "topbar.promo": "-10% voor nieuwe klanten met code WELKOM10 | Gratis levering vanaf €100",
    
    // Footer & Pages
    "footer.about": "Over ons",
    "footer.contact": "Contact",
    "footer.faq": "FAQ",
    "footer.cgv": "Algemene voorwaarden",
    "footer.legal": "Juridische vermeldingen",
    "footer.privacy": "Privacy",
    "footer.cookies": "Cookies",
    
    // Checkout
    "checkout.title": "Mijn bestelling afronden",
    "checkout.shipping": "Levering",
    "checkout.payment": "Betaling",
    "checkout.review": "Verificatie",
    "checkout.complete": "Bestellen",
    "checkout.subtotal": "Subtotaal",
    "checkout.shipping_cost": "Verzendkosten",
    "checkout.total": "Totaal",
    "checkout.discount": "Korting",
    "checkout.shipping_address": "Leveringsadres",
    "checkout.billing_address": "Factuuradres",
    "checkout.edit": "Bewerken",
    "checkout.continue_to_delivery": "Verder naar levering →",
    "checkout.first_name": "Voornaam",
    "checkout.last_name": "Achternaam",
    "checkout.address": "Adres",
    "checkout.company": "Bedrijf",
    "checkout.postal_code": "Postcode",
    "checkout.city": "Stad",
    "checkout.country": "Land",
    "checkout.province": "Provincie / Staat",
    "checkout.email": "E-mail",
    "checkout.phone": "Telefoon",
    "checkout.billing_same_as_shipping": "Factuuradres is hetzelfde als leveringsadres",
    
    // Bpost pickup
    "bpost.title": "Kies een Bpost afhaalpunt",
    "bpost.search": "Zoeken",
    "bpost.postal_code": "Postcode",
    "bpost.search_placeholder": "Zoek een afhaalpunt...",
    "bpost.selected": "Geselecteerd",
    "bpost.no_results": "Geen afhaalpunten gevonden voor deze postcode.",
    "bpost.no_search_results": "Geen afhaalpunten komen overeen met uw zoekopdracht.",
    
    // Common
    "common.edit": "Bewerken",
    "common.add_to_cart": "Toevoegen aan winkelwagen",
    "common.buy_now": "Nu kopen",
    "common.out_of_stock": "Niet op voorraad",
    "common.in_stock": "Op voorraad",
    "common.price": "Prijs",
    "common.quantity": "Hoeveelheid",
    "common.continue_shopping": "Verder winkelen",
    "common.view_cart": "Bekijk winkelwagen",
    "cart.title": "Mijn winkelwagen",
    "cart.item": "Artikel",
    "cart.quantity": "Hoeveelheid",
    "cart.price": "Prijs",
    "cart.total": "Totaal",
  },
}

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations.fr

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang]?.[key] || translations.fr[key] || key
}

