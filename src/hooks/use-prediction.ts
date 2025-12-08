import { useMutation } from '@tanstack/react-query'

export interface PredictionRequest {
  id: string
  title: string
}

export interface PredictionResponse {
  id: string
  title: string
  prediction: {
    label: string
    score: number
    isOutlier: boolean
  }
}

export function usePrediction() {
  return useMutation<PredictionResponse, Error, PredictionRequest>({
    mutationFn: async (data) => {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        const errorMessage = result.error || 'Failed to get prediction'
        const errorDetails = result.details ? `: ${result.details}` : ''
        throw new Error(`${errorMessage}${errorDetails}`)
      }
      
      // Check if response has error field (even with 200 status)
      if (result.error) {
        throw new Error(result.error + (result.details ? `: ${result.details}` : ''))
      }
      
      return result
    },
  })
}

