import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Container, Heading } from "@medusajs/ui"
import { AdminProduct } from "@medusajs/framework/types"

/**
 * Widget qui affiche les catégories d'un produit dans la page de détail
 * 
 * Note : Medusa v2 ne permet pas d'ajouter des colonnes à la table de liste des produits.
 * Ce widget affiche les catégories sur la page de détail du produit.
 */
const ProductCategoriesWidget = ({ data }: { data: AdminProduct }) => {
  const categories = data.categories || []

  if (categories.length === 0) {
    return (
      <Container className="p-4 bg-gray-50">
        <Heading level="h2" className="mb-2">Catégories</Heading>
        <p className="text-sm text-gray-500">Aucune catégorie associée</p>
      </Container>
    )
  }

  return (
    <Container className="p-4">
      <Heading level="h2" className="mb-3">Catégories</Heading>
      <div className="flex flex-wrap gap-2">
        {categories.map((category: any) => (
          <Badge key={category.id} size="small" color="blue">
            {category.name}
          </Badge>
        ))}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductCategoriesWidget
