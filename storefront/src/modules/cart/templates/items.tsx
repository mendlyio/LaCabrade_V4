import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading, Table } from "@medusajs/ui"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  items?: HttpTypes.StoreCartLineItem[]
}

const ItemsTemplate = ({ items }: ItemsTemplateProps) => {
  return (
    <div>
      <div className="pb-3 flex items-center">
        <Heading className="text-lg sm:text-2xl font-bold text-gray-900">
          Votre panier
        </Heading>
      </div>
      <div className="w-full overflow-x-auto -mx-1 px-1">
        <Table>
          <Table.Header className="border-t-0">
            <Table.Row className="text-gray-600 text-xs sm:text-sm font-semibold">
              <Table.HeaderCell className="!pl-0">Article</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
              <Table.HeaderCell className="hidden sm:table-cell">Quantité</Table.HeaderCell>
              <Table.HeaderCell className="hidden md:table-cell">
                Prix
              </Table.HeaderCell>
              <Table.HeaderCell className="!pr-0 text-right">
                Total
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items
              ? items
                  .sort((a, b) => {
                    return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                  })
                  .map((item) => {
                    return <Item key={item.id} item={item} />
                  })
              : repeat(5).map((i) => {
                  return <SkeletonLineItem key={i} />
                })}
          </Table.Body>
        </Table>
      </div>
    </div>
  )
}

export default ItemsTemplate
