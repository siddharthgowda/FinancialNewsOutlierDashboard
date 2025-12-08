'use client'

import { useNews } from '@/hooks/use-news'
import { usePrediction } from '@/hooks/use-prediction'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StackedBarChart } from '@/components/stacked-bar-chart'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TICKERS } from '@/constants/tickers'

interface NewsWithPrediction {
  id: string
  title: string
  source: string
  date: string
  prediction?: {
    label: string
    score: number
    isOutlier: boolean
  }
  isLoading?: boolean
}

export default function Home() {
  const [selectedTicker, setSelectedTicker] = useState<string>('')
  const [fetchTicker, setFetchTicker] = useState<string | null>(null)
  const { data: newsData, isLoading: newsLoading, refetch } = useNews(fetchTicker)
  const predictionMutation = usePrediction()
  const queryClient = useQueryClient()
  const [predictions, setPredictions] = useState<
    Record<string, { label: string; score: number; isOutlier: boolean }>
  >({})
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const seenNewsIdsRef = useRef<Set<string>>(new Set())
  const isAutoPredictingRef = useRef(false)

  // Derive news items from query data
  const newsWithPredictions = useMemo<NewsWithPrediction[]>(() => {
    if (!newsData?.news) return []
    return newsData.news.map((item) => ({
      ...item,
      prediction: predictions[item.id],
      isLoading: loadingItems.has(item.id),
    }))
  }, [newsData?.news, predictions, loadingItems])

  // Calculate prediction statistics
  const predictionStats = useMemo(() => {
    const itemsWithPredictions = newsWithPredictions.filter((item) => item.prediction)
    const total = itemsWithPredictions.length
    if (total === 0) {
      return { normal: 0, outlier: 0, normalPercent: 0, outlierPercent: 0, total: 0 }
    }
    const outlierCount = itemsWithPredictions.filter((item) => item.prediction?.isOutlier).length
    const normalCount = total - outlierCount
    return {
      normal: normalCount,
      outlier: outlierCount,
      normalPercent: (normalCount / total) * 100,
      outlierPercent: (outlierCount / total) * 100,
      total,
    }
  }, [newsWithPredictions])

  // Extract words from all headlines and calculate frequencies
  const wordFrequencyData = useMemo(() => {
    if (!newsData?.news || newsData.news.length === 0) return []

    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each',
      'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
      'don', 'should', 'now', 'stock', 'stocks', 'company', 'companies', 'market', 'markets',
      'news', 'report', 'reports', 'says', 'said', 'saying', 'year', 'years', 'day', 'days',
      'time', 'times', 'new', 'first', 'last', 'next', 'previous', 'after', 'before',
    ])

    // Extract all words from headlines
    const wordCounts = new Map<string, number>()
    
    newsData.news.forEach((item) => {
      const text = item.title.toLowerCase()
      // Split by word boundaries and filter
      const words = text
        .split(/\W+/)
        .filter((word) => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word))
      
      words.forEach((word) => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      })
    })

    // Convert to array and sort by frequency (most to least frequent), then take top 5
    return Array.from(wordCounts.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Only show top 10 words
  }, [newsData?.news])

  const handlePredict = useCallback(
    async (newsItem: NewsWithPrediction) => {
      setLoadingItems((prev) => new Set(prev).add(newsItem.id))

      try {
        const result = await predictionMutation.mutateAsync({
          id: newsItem.id,
          title: newsItem.title,
        })
        setPredictions((prev) => ({
          ...prev,
          [newsItem.id]: result.prediction,
        }))
      } catch (error) {
        console.error('Prediction error:', error)
      } finally {
        setLoadingItems((prev) => {
          const next = new Set(prev)
          next.delete(newsItem.id)
          return next
        })
      }
    },
    [predictionMutation]
  )

  // Clear news and auto-fetch when ticker selection changes
  useEffect(() => {
    // Only clear and fetch if ticker changed
    if (selectedTicker && selectedTicker !== fetchTicker) {
      // Clear previous news data, predictions, and seen IDs when ticker changes
      queryClient.removeQueries({ queryKey: ['news'] })
      queryClient.resetQueries({ queryKey: ['news'] })
      setPredictions({})
      seenNewsIdsRef.current = new Set()
      // Automatically fetch news for the new ticker
      setFetchTicker(selectedTicker)
    }
  }, [selectedTicker, fetchTicker, queryClient])


  // Auto-predict new articles one at a time
  const autoPredictNewArticles = useCallback(
    async (newArticles: NewsWithPrediction[]) => {
      if (isAutoPredictingRef.current || newArticles.length === 0) return
      isAutoPredictingRef.current = true

      for (const item of newArticles) {
        // Skip if already has prediction or is loading
        if (predictions[item.id] || loadingItems.has(item.id)) continue

        await handlePredict(item)
        // Delay between predictions to avoid rate limiting (1 second)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      isAutoPredictingRef.current = false
    },
    [predictions, loadingItems, handlePredict]
  )

  // Track seen news IDs and auto-predict new articles when news data changes
  useEffect(() => {
    if (!newsData?.news) return

    const currentIds = new Set(newsData.news.map((item) => item.id))
    const prevSeenIds = seenNewsIdsRef.current
    
    // Find new articles that need prediction (before updating seen IDs)
    const newArticles = newsData.news.filter(
      (item) => !prevSeenIds.has(item.id) && !predictions[item.id]
    )

    // Update seen IDs
    currentIds.forEach((id) => seenNewsIdsRef.current.add(id))

    // Auto-predict new articles
    if (newArticles.length > 0) {
      setTimeout(() => autoPredictNewArticles(newArticles), 100)
    }
  }, [newsData?.news, autoPredictNewArticles, predictions])

  // Poll for news every minute when ticker is selected
  // Note: autoPredictNewArticles useEffect will automatically handle predictions for new articles
  useEffect(() => {
    if (!fetchTicker || !refetch) return

    // Set up interval to poll every minute (60000ms)
    const intervalId = setInterval(async () => {
      await refetch()
      // autoPredictNewArticles useEffect will automatically detect and predict new articles
    }, 60000)

    return () => clearInterval(intervalId)
  }, [fetchTicker, refetch])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1 text-foreground">Financial News Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Analyze news headlines for stock market outliers using FinBERT
        </p>
      </div>

      <div className="mb-6">
        <div className="max-w-xs">
          <label htmlFor="ticker-select" className="block text-sm font-medium mb-2 text-foreground">
            Select Ticker
          </label>
          <select
            id="ticker-select"
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all"
          >
            <option value="">-- Select a ticker --</option>
            {TICKERS.map((ticker) => (
              <option key={ticker} value={ticker}>
                {ticker}
              </option>
            ))}
          </select>
        </div>
      </div>

      {newsData?.error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200 font-semibold">{newsData.error}</p>
          {newsData.details && (
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{newsData.details}</p>
          )}
        </div>
      )}

      {fetchTicker && newsData?.ticker && (
        <div className="mb-6">
          {/* Header */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing news for <span className="font-semibold text-foreground">{newsData.ticker}</span>
              {newsData.count !== undefined && (
                <span className="ml-2">({newsData.count} articles)</span>
              )}
            </p>
          </div>
          
          {/* Prediction Statistics Card - At Top */}
          {predictionStats.total > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Prediction Distribution</h3>
                <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {predictionStats.total} analyzed
                </span>
              </div>
              
              {/* D3 Stacked Bar Chart */}
              <div className="mb-3 w-full">
                <StackedBarChart 
                  normal={predictionStats.normal} 
                  outlier={predictionStats.outlier}
                  width={800}
                  height={120}
                />
              </div>
              
              {/* Stats Text */}
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-600"></div>
                  <span className="text-muted-foreground">
                    Normal: <span className="font-semibold text-foreground">{predictionStats.normal}</span> ({predictionStats.normalPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-600"></div>
                  <span className="text-muted-foreground">
                    Outlier: <span className="font-semibold text-foreground">{predictionStats.outlier}</span> ({predictionStats.outlierPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {newsLoading ? (
        <div className="text-center py-8">Loading news...</div>
      ) : !fetchTicker ? (
        <div className="text-center py-12 border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <p className="text-muted-foreground">Select a ticker to get started</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Prediction</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newsWithPredictions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No news data available
                  </TableCell>
                </TableRow>
              ) : (
                newsWithPredictions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.source}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>
                      {item.prediction ? (
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.prediction.isOutlier
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {item.prediction.isOutlier ? 'Outlier' : 'Normal'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.prediction
                        ? item.prediction.score.toFixed(3)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handlePredict(item)}
                        disabled={item.isLoading || predictionMutation.isPending}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
                        {item.isLoading ? 'Predicting...' : 'Predict'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Keyword Frequency Table - At Bottom */}
      {fetchTicker && wordFrequencyData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm mt-6 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-foreground">Keyword Frequency</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Keyword</TableHead>
                <TableHead className="text-right py-2 px-4 w-24">Frequency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wordFrequencyData.map((item, index) => (
                <TableRow key={`${item.text}-${index}`}>
                  <TableCell className="font-medium py-2 px-4">{item.text}</TableCell>
                  <TableCell className="text-right py-2 px-4">{item.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
