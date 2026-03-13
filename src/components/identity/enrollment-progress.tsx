import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface EnrollmentProgressProps {
  currentStep: number
  steps?: string[]
}

const defaultSteps = ["Upload Photos", "Verify Identity", "Complete"]

export function EnrollmentProgress({
  currentStep,
  steps = defaultSteps,
}: EnrollmentProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isFuture = stepNumber > currentStep

          return (
            <div key={step} className="flex flex-1 items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isCompleted && "bg-green-600 text-white",
                    isCurrent && "bg-blue-600 text-white",
                    isFuture && "bg-gray-200 text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-4" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    isCompleted && "text-green-600",
                    isCurrent && "text-blue-600",
                    isFuture && "text-gray-400"
                  )}
                >
                  {step}
                </span>
              </div>

              {/* Connecting line (not after last step) */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 mb-6 h-0.5 flex-1",
                    stepNumber < currentStep ? "bg-green-600" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
