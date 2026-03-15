"use client"

import { Table, Text, clx } from "@medusajs/ui"

import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { lineItemToTrackingItem } from "@lib/tracking"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
}

const Item = ({ item, type = "full" }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const { handle } = item.variant?.product ?? {}

  const trackingItem = useMemo(
    () =>
      lineItemToTrackingItem(
        item as any,
        item.product_title ?? undefined,
        (item as any).variant?.product?.categories?.[0]?.name
      ),
    [item]
  )

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    try {
      await updateLineItem({
        lineId: item.id,
        quantity,
      })
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? "Erreur")
    } finally {
      setUpdating(false)
    }
  }

  const maxQtyFromInventory = 10
  const maxQuantity = item.variant?.manage_inventory ? 10 : maxQtyFromInventory

  return (
    <Table.Row className="w-full" data-testid="product-row">
      <Table.Cell className="!pl-0 p-2 sm:p-4 w-14 sm:w-24">
        <LocalizedClientLink
          href={`/products/${handle}`}
          className={clx("flex", {
            "w-12 sm:w-16": type === "preview",
            "w-14 sm:w-20 md:w-24": type === "full",
          })}
        >
          <Thumbnail
            thumbnail={item.variant?.product?.thumbnail}
            images={item.variant?.product?.images}
            size="square"
            alt={item.product_title ?? "Produit"}
          />
        </LocalizedClientLink>
      </Table.Cell>

      <Table.Cell className="text-left p-2 sm:p-4">
        <Text
          className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2"
          data-testid="product-title"
        >
          {item.product_title}
        </Text>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
        {/* Mobile : afficher quantité + delete inline */}
        {type === "full" && (
          <div className="flex sm:hidden items-center gap-2 mt-2">
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              className="w-14 h-8 text-xs p-1"
              data-testid="product-select-button"
            >
              {Array.from(
                { length: Math.min(maxQuantity, 10) },
                (_, i) => (
                  <option value={i + 1} key={i}>{i + 1}</option>
                )
              )}
            </CartItemSelect>
            <DeleteButton id={item.id} trackingItem={trackingItem} data-testid="product-delete-button" />
            {updating && <Spinner />}
          </div>
        )}
      </Table.Cell>

      {/* Desktop: Quantité */}
      {type === "full" && (
        <Table.Cell className="hidden sm:table-cell p-2 sm:p-4">
          <div className="flex gap-2 items-center">
            <DeleteButton id={item.id} trackingItem={trackingItem} data-testid="product-delete-button" />
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              className="w-14 h-10 p-2"
              data-testid="product-select-button"
            >
              {Array.from(
                { length: Math.min(maxQuantity, 10) },
                (_, i) => (
                  <option value={i + 1} key={i}>{i + 1}</option>
                )
              )}
            </CartItemSelect>
            {updating && <Spinner />}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </Table.Cell>
      )}

      {/* Desktop: Prix unitaire */}
      {type === "full" && (
        <Table.Cell className="hidden md:table-cell p-2 sm:p-4">
          <LineItemUnitPrice item={item} style="tight" />
        </Table.Cell>
      )}

      {/* Total */}
      <Table.Cell className="!pr-0 p-2 sm:p-4">
        <span
          className={clx("!pr-0", {
            "flex flex-col items-end h-full justify-center": type === "preview",
          })}
        >
          {type === "preview" && (
            <span className="flex gap-x-1">
              <Text className="text-ui-fg-muted text-xs">{item.quantity}x </Text>
              <LineItemUnitPrice item={item} style="tight" />
            </span>
          )}
          <LineItemPrice item={item} style="tight" />
        </span>
      </Table.Cell>
    </Table.Row>
  )
}

export default Item
