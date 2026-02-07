import { RadioGroup } from "@headlessui/react"
import { Text, clx } from "@medusajs/ui"
import React from "react"

import PaymentTest from "../payment-test"
import { isManual } from "@lib/constants"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
}

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development"
  const isSelected = selectedPaymentOptionId === paymentProviderId

  return (
    <RadioGroup.Option
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "relative flex items-center justify-between cursor-pointer py-4 px-5 border-2 rounded-xl transition-all duration-200",
        {
          "border-amber-500 bg-amber-50 shadow-sm": isSelected,
          "border-gray-200 hover:border-gray-300 hover:bg-gray-50": !isSelected,
        }
      )}
    >
      <div className="flex items-center gap-4">
        <div className={clx(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
          {
            "border-amber-600": isSelected,
            "border-gray-300": !isSelected,
          }
        )}>
          {isSelected && (
            <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <Text className={clx("text-sm font-medium", {
            "text-gray-900": isSelected,
            "text-gray-700": !isSelected,
          })}>
            {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
          </Text>
          {isManual(paymentProviderId) && isDevelopment && (
            <PaymentTest className="hidden small:block" />
          )}
        </div>
      </div>
      <span className="text-gray-500">
        {paymentInfoMap[paymentProviderId]?.icon}
      </span>
      {isManual(paymentProviderId) && isDevelopment && (
        <PaymentTest className="small:hidden text-[10px]" />
      )}
    </RadioGroup.Option>
  )
}

export default PaymentContainer
