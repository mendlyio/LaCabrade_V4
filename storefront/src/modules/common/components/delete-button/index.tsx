"use client"

import { deleteLineItem } from "@lib/data/cart"
import Spinner from "@medusajs/icons/dist/esm/spinner"
import Trash from "@medusajs/icons/dist/esm/trash"
import { clx } from "@medusajs/ui"
import { useRouter } from "next/navigation"
import { useState } from "react"

const DeleteButton = ({
  id,
  children,
  className,
}: {
  id: string
  children?: React.ReactNode
  className?: string
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (lineId: string) => {
    setIsDeleting(true)
    try {
      await deleteLineItem(lineId)
      router.refresh()
    } catch (err) {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={clx(
        "flex items-center justify-between text-small-regular",
        className
      )}
    >
      <button
        className="flex gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer"
        onClick={() => handleDelete(id)}
        disabled={isDeleting}
      >
        {isDeleting ? <Spinner className="animate-spin" /> : <Trash />}
        <span>{children}</span>
      </button>
    </div>
  )
}

export default DeleteButton
