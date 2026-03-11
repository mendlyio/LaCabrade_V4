/**
 * Liste uniquement les handles des catégories (pour debug 404).
 * Usage: npx medusa exec src/scripts/list-category-handles.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function listCategoryHandles({ container }: ExecArgs) {
  const productService = container.resolve(Modules.PRODUCT) as any

  const categories = await productService.listProductCategories(
    {},
    { select: ["id", "name", "handle"], take: 1000 }
  )

  console.log(`\n📋 ${categories.length} catégorie(s) :\n`)
  categories.forEach((c: any, i: number) => {
    console.log(`${i + 1}. ${c.name}`)
    console.log(`   handle: ${c.handle}`)
  })
  console.log("")
}
