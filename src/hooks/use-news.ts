import { useQuery } from '@tanstack/react-query'

export interface NewsItem {
  id: string
  title: string
  source: string
  date: string
  articleUrl?: string
  description?: string
  tickers?: string[]
}

export interface NewsResponse {
  news: NewsItem[]
  count?: number
  ticker?: string
  error?: string
  details?: string
}

export function useNews(ticker: string | null) {
  return useQuery<NewsResponse>({
    queryKey: ['news', ticker],
    queryFn: async () => {
      if (!ticker) {
        return { news: [] }
      }
      const response = await fetch(`/api/news?ticker=${encodeURIComponent(ticker)}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch news')
      }
      return response.json()
    },
    enabled: !!ticker, // Only fetch when ticker is provided
  })
}

