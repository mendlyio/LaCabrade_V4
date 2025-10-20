# 🏗️ Architecture des Composants - Header & Footer

## 📊 Vue d'ensemble de la Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Layout Principal                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │                 <Nav />                            │ │
│  ├───────────────────────────────────────────────────┤ │
│  │              Main Content                          │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                <Footer />                          │ │
│  └───────────────────────────────────────────────────┘ │
│  │          <ScrollToTop /> (floating)                │ │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Composants Header (Nav)

### Structure Hiérarchique

```
<Nav /> (Server Component)
├── 📢 Bannière Promotionnelle
│   └── Message rotatif + animations
│
├── 🔝 Top Bar
│   ├── Infos confiance (gauche)
│   └── Liens rapides (droite)
│
└── 🎨 Main Navigation
    ├── 🍔 Mobile
    │   └── <SideMenu /> (Client Component)
    │       ├── Burger animé
    │       ├── Overlay
    │       ├── Panel slide-in
    │       ├── Menu items + icônes
    │       ├── Liens rapides
    │       ├── Country select
    │       └── Réseaux sociaux
    │
    ├── 🏠 Logo
    │   ├── Icône emoji/image
    │   ├── Nom boutique
    │   └── Baseline
    │
    ├── 📋 Desktop Menu
    │   ├── Boutique
    │   ├── <MegaMenu /> (Client Component)
    │   │   ├── Button trigger
    │   │   └── Dropdown Panel
    │   │       ├── Header avec onglets
    │   │       │   ├── Tab Catégories
    │   │       │   └── Tab Collections
    │   │       ├── Content Grid
    │   │       │   ├── Catégories avec icônes
    │   │       │   │   └── Sous-catégories
    │   │       │   └── Collections avec cards
    │   │       └── Footer avec CTA
    │   ├── Nouveautés (badge NEW)
    │   ├── Promotions (badge 🔥)
    │   └── Marques
    │
    └── 🎬 Actions
        ├── <SearchBar /> (Client Component)
        │   ├── Input avec icône
        │   ├── Dropdown suggestions
        │   │   ├── Recherches populaires
        │   │   ├── Résultats autocomplete
        │   │   └── Footer avec shortcuts
        │   └── Animations fade-in
        │
        ├── 💚 Wishlist (bouton)
        │   └── Badge compteur
        │
        ├── 👤 Account (bouton)
        │
        └── 🛒 <CartButton /> (Server Component)
            └── <CartDropdown /> (Client Component)
                ├── Button avec badge
                └── Dropdown Panel
                    ├── Header coloré
                    ├── Liste articles
                    │   ├── Thumbnail
                    │   ├── Infos produit
                    │   └── Actions
                    └── Footer
                        ├── Sous-total
                        ├── Badge livraison
                        └── CTA "Voir panier"
```

## 🦶 Composants Footer

### Structure Hiérarchique

```
<Footer /> (Server Component)
│
├── 📧 Section Newsletter
│   ├── Background gradient
│   ├── Titre + description
│   ├── <NewsletterForm /> (Client Component)
│   │   ├── Input email
│   │   ├── Button submit
│   │   ├── États (loading/success/error)
│   │   └── Message feedback
│   └── Liste avantages
│
├── 📚 Main Content (5 colonnes)
│   │
│   ├── 1️⃣ Colonne À Propos
│   │   ├── Logo + nom
│   │   ├── Description
│   │   └── Réseaux sociaux
│   │       ├── Facebook
│   │       ├── Instagram
│   │       ├── YouTube
│   │       └── TikTok
│   │
│   ├── 2️⃣ Colonne Catégories
│   │   ├── Titre
│   │   ├── Liste catégories (8 max)
│   │   └── Lien "Voir plus"
│   │
│   ├── 3️⃣ Colonne Collections
│   │   ├── Titre
│   │   └── Liste collections
│   │
│   ├── 4️⃣ Colonne Service Client
│   │   ├── Titre
│   │   └── Liens utiles
│   │       ├── Mon compte
│   │       ├── Mes commandes
│   │       ├── Contact
│   │       ├── FAQ
│   │       ├── Livraison
│   │       ├── Retours
│   │       └── Garanties
│   │
│   └── 5️⃣ Colonne Informations
│       ├── Titre
│       ├── Liens
│       │   ├── Qui sommes-nous
│       │   ├── Magasins
│       │   ├── Blog
│       │   └── Recrutement
│       └── Bloc Contact
│           ├── Téléphone
│           ├── Email
│           └── Horaires
│
├── 🏆 Trust Badges (4 badges)
│   ├── 🚚 Livraison rapide
│   ├── 🔒 Paiement sécurisé
│   ├── ↩️ Retours gratuits
│   └── 💬 Service client
│
└── 📄 Bottom Bar
    ├── Copyright
    ├── Liens légaux
    │   ├── Mentions légales
    │   ├── CGV
    │   ├── Confidentialité
    │   └── Cookies
    └── Moyens de paiement
        ├── CB
        ├── PayPal
        ├── Virement
        └── 3x sans frais
```

## 🔄 Composants Utilitaires

### ScrollToTop
```
<ScrollToTop /> (Client Component)
├── Visible après scroll > 300px
├── Position: fixed bottom-right
├── Bouton rond avec icône
└── Animation smooth scroll to top
```

### PromoBanner
```
<PromoBanner /> (Client Component)
├── Messages rotatifs (array)
├── Auto-rotation (5s)
├── Indicateurs de progression
├── Bouton fermeture
└── Animations transitions
```

## 📦 Types de Composants

### Server Components (Fetch Data)
- ✅ `<Nav />` - Fetch regions, categories, collections
- ✅ `<Footer />` - Fetch categories, collections
- ✅ `<CartButton />` - Fetch cart

### Client Components (Interactivity)
- ✅ `<MegaMenu />` - Dropdown interactif
- ✅ `<SearchBar />` - Input + suggestions
- ✅ `<SideMenu />` - Menu mobile
- ✅ `<CartDropdown />` - Panier dropdown
- ✅ `<NewsletterForm />` - Form avec états
- ✅ `<ScrollToTop />` - Scroll detection
- ✅ `<PromoBanner />` - Auto-rotation

## 🎨 Dépendances Entre Composants

```
Layout (index.tsx)
│
├──> Nav
│    ├──> SideMenu
│    │    └──> CountrySelect
│    ├──> MegaMenu (new)
│    ├──> SearchBar (new)
│    └──> CartButton
│         └──> CartDropdown
│              ├──> Thumbnail
│              ├──> LineItemOptions
│              ├──> LineItemPrice
│              └──> DeleteButton
│
├──> Footer
│    └──> NewsletterForm (new)
│
└──> ScrollToTop (new)
```

## 📊 Flux de Données

### Navigation avec Mega Menu

```
1. User clique "Catégories"
   ↓
2. <MegaMenu /> ouvre dropdown
   ↓
3. Affiche categories (passées en props)
   ↓
4. User clique catégorie
   ↓
5. Navigation vers /categories/{handle}
   ↓
6. Dropdown se ferme
```

### Recherche

```
1. User tape dans <SearchBar />
   ↓
2. onChange met à jour query state
   ↓
3. useEffect filtre suggestions
   ↓
4. Affiche dropdown avec résultats
   ↓
5. User sélectionne ou Enter
   ↓
6. Navigation vers /search?q={query}
```

### Newsletter

```
1. User entre email dans <NewsletterForm />
   ↓
2. Validation côté client
   ↓
3. Submit avec état loading
   ↓
4. API call (simulé pour l'instant)
   ↓
5. Affiche succès ou erreur
   ↓
6. Reset après 5s
```

### Cart Dropdown

```
1. User survole bouton panier
   ↓
2. <CartDropdown /> ouvre
   ↓
3. Affiche cart items (props)
   ↓
4. User peut supprimer items
   ↓
5. User clique "Voir panier"
   ↓
6. Navigation vers /cart
```

## 🎯 Points d'Extension

### Pour ajouter une fonctionnalité:

#### Nouvelle catégorie dans le menu
```typescript
// Dans Nav/index.tsx
<LocalizedClientLink href="/nouvelle-page">
  Nouvelle Page
</LocalizedClientLink>
```

#### Nouveau badge
```typescript
// Dans Nav/index.tsx
<span className="absolute -top-1 -right-1 bg-color...">
  TEXT
</span>
```

#### Nouvelle animation
```css
/* Dans globals.css */
@keyframes nouvelle-anim {
  from { ... }
  to { ... }
}

.animate-nouvelle-anim {
  animation: nouvelle-anim 0.3s ease-out;
}
```

#### Nouvelle colonne footer
```typescript
// Dans Footer/index.tsx
<div>
  <h3>Nouveau Titre</h3>
  <ul>
    {/* Liens */}
  </ul>
</div>
```

## 🔍 Debug & Troubleshooting

### Trouver un composant
```bash
# Recherche par nom
grep -r "MegaMenu" storefront/src

# Recherche par fonctionnalité
grep -r "newsletter" storefront/src
```

### Vérifier les props
```typescript
// Ajoutez des console.log
console.log('Categories:', categories)
console.log('Collections:', collections)
```

### Tester les états
```typescript
// Dans un Client Component
const [debug, setDebug] = useState(true)

{debug && (
  <div className="fixed top-0 right-0 bg-red-500 p-4">
    Debug: {JSON.stringify(yourData)}
  </div>
)}
```

## 📈 Métriques de Complexité

| Composant | Lignes | Complexité | Type |
|-----------|--------|------------|------|
| Nav | ~230 | Moyenne | Server |
| Footer | ~350 | Moyenne | Server |
| MegaMenu | ~280 | Haute | Client |
| SearchBar | ~180 | Moyenne | Client |
| SideMenu | ~150 | Moyenne | Client |
| CartDropdown | ~220 | Moyenne | Client |
| NewsletterForm | ~80 | Faible | Client |
| ScrollToTop | ~50 | Faible | Client |

## 🎓 Best Practices Implémentées

1. ✅ **Separation of Concerns**: Chaque composant a une responsabilité unique
2. ✅ **Composition**: Les composants sont composables
3. ✅ **Props Drilling évité**: Context ou Server/Client boundary
4. ✅ **TypeScript**: Tous les composants sont typés
5. ✅ **Accessibility**: ARIA, keyboard navigation
6. ✅ **Performance**: Server Components par défaut
7. ✅ **Maintainability**: Code clair et documenté
8. ✅ **Scalability**: Facilement extensible

---

Cette architecture est conçue pour être:
- 🚀 **Performante**
- 🎨 **Moderne**
- ♿ **Accessible**
- 📱 **Responsive**
- 🔧 **Maintenable**
- 📈 **Scalable**




