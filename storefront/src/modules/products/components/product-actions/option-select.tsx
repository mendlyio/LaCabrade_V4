import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
  disabledValues?: string[] // Valeurs indisponibles (pas en stock pour cette combinaison)
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
  disabledValues = [],
}) => {
  const filteredOptions = option.values?.map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-sm font-medium">Choisir {title}</span>
      <div
        className="flex flex-wrap justify-between gap-2"
        data-testid={dataTestId}
      >
        {filteredOptions?.map((v) => {
          const isSelected = v === current
          const isUnavailable = disabledValues.includes(v ?? "")
          
          return (
            <button
              onClick={() => !isUnavailable && updateOption(option.title ?? "", v ?? "")}
              key={v}
              className={clx(
                "border text-small-regular h-10 rounded-lg p-2 flex-1 transition-all duration-150 relative",
                {
                  // Bouton sélectionné : fond foncé + texte blanc
                  "bg-gray-900 text-white border-gray-900 font-semibold": isSelected && !isUnavailable,
                  // Bouton disponible non sélectionné : fond clair + texte foncé
                  "bg-white border-gray-300 text-gray-900 hover:border-gray-400 hover:shadow-md": !isSelected && !isUnavailable,
                  // Bouton indisponible : grisé + barré
                  "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed line-through": isUnavailable,
                }
              )}
              disabled={disabled || isUnavailable}
              data-testid="option-button"
              title={isUnavailable ? "Combinaison non disponible" : undefined}
            >
              {v}
              {isUnavailable && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-full h-[1px] bg-gray-400" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
