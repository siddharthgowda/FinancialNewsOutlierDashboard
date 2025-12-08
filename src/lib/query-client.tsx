'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Data is fresh for 60 seconds
            refetchOnWindowFocus: false, // Don't refetch on window focus
            refetchOnMount: false, // Don't refetch on component mount if data exists
            refetchOnReconnect: false, // Don't refetch on reconnect
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

