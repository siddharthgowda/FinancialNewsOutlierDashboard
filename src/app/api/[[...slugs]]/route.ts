import { Elysia, t } from 'elysia'

const app = new Elysia({ prefix: '/api' })
  .onError(({ code, error, set }) => {
    console.error('Elysia error:', code, error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (code === 'VALIDATION') {
      set.status = 400
      return {
        error: 'Validation error',
        details: errorMessage,
      }
    }
    set.status = 500
    return {
      error: 'Internal server error',
      details: errorMessage,
    }
  })
  // Fetch news from Massive.com News API
  .get('/news', async ({ query, set }) => {
    try {
      const ticker = query.ticker as string | undefined
      const order = (query.order as string | undefined) || 'desc'
      const limit = (query.limit as string | undefined) || '50'
      const sort = (query.sort as string | undefined) || 'published_utc'
      // Time window in hours (default: 24 hours = 1 day)
      const timeWindowHours = query.timeWindowHours 
        ? parseInt(query.timeWindowHours as string, 10) 
        : 24
      const apiKey = process.env.POLYGON_API_KEY

      if (!apiKey) {
        set.status = 500
        return {
          error: 'POLYGON_API_KEY is not set',
          details: 'Please set POLYGON_API_KEY in your .env.local file',
        }
      }

      if (!ticker) {
        set.status = 400
        return {
          error: 'Ticker parameter is required',
          details: 'Please provide a ticker symbol',
        }
      }

      if (isNaN(timeWindowHours) || timeWindowHours <= 0) {
        set.status = 400
        return {
          error: 'Invalid timeWindowHours parameter',
          details: 'timeWindowHours must be a positive number',
        }
      }

      // Calculate date based on time window parameter
      const now = new Date()
      const timeAgo = new Date(now.getTime() - timeWindowHours * 60 * 60 * 1000)
      // Format as ISO 8601 date-time string (RFC3339 format)
      const publishedAfter = timeAgo.toISOString()

      // Fetch news from Massive.com API
      // Documentation: https://massive.com/docs/rest/stocks/news
      // Endpoint: https://api.massive.com/v2/reference/news
      const params = new URLSearchParams({
        ticker,
        order,
        limit,
        sort,
        'published_utc.gte': publishedAfter, // Greater than or equal to timeWindowHours ago
      })
      
      const response = await fetch(
        `https://api.massive.com/v2/reference/news?${params.toString()}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Massive.com API error:', response.status, errorText)
        set.status = response.status
        return {
          error: `Massive.com API error: ${response.status}`,
          details: errorText,
        }
      }

      const data = await response.json() as {
        results?: Array<{
          id?: string
          title?: string
          publisher?: { name?: string }
          published_utc?: string
          article_url?: string
          description?: string
          tickers?: string[]
        }>
        count?: number
      }

      // Transform Massive.com API response to our format
      const news = (data.results || []).map((article, index: number) => ({
        id: article.id || `massive-${index}`,
        title: article.title || 'No title',
        source: article.publisher?.name || 'Unknown',
        date: article.published_utc
          ? new Date(article.published_utc).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        articleUrl: article.article_url,
        description: article.description,
        tickers: article.tickers || [],
      }))

      return {
        news,
        count: data.count || news.length,
        ticker,
      }
    } catch (error) {
      console.error('Error in /api/news route:', error)
      set.status = 500
      return {
        error: 'Failed to fetch news from Massive.com API',
        details: error instanceof Error ? error.message : String(error),
      }
    }
  }, {
    query: t.Object({
      ticker: t.Optional(t.String()),
      order: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      sort: t.Optional(t.String()),
      timeWindowHours: t.Optional(t.String()),
    }),
  })
  // Prediction API using Hugging Face model
  .post(
    '/predict',
    async ({ body, set }) => {
      // Try multiple environment variable names
      const token = 
        process.env.HUGGING_FACE_TOKEN || 
        process.env.NEXT_PUBLIC_HUGGING_FACE_TOKEN ||
        process.env.HF_TOKEN
      
      if (!token) {
        console.error('Environment variables available:', Object.keys(process.env).filter(k => k.includes('HUGGING') || k.includes('HF')))
        set.status = 500
        return { 
          error: 'HUGGING_FACE_TOKEN is not set',
          details: 'Please create a .env.local file with HUGGING_FACE_TOKEN=your_token_here'
        }
      }

      try {
        // WARNING: This endpoint is for demonstration purposes only.
        // For anyone other than the authors (Siddharth Gowda, Ruitao Xu, Renying Chen) of this project,
        // you MUST replace this with your own hosted model endpoint.
        // Using this endpoint without permission violates the license terms.
        // See README.md for details on configuring your own endpoint.
        const inferenceEndpoint = 'https://wal8pi4mis7eo02j.us-east4.gcp.endpoints.huggingface.cloud'
        
        const response = await fetch(inferenceEndpoint, {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            inputs: body.title,
            parameters: {},
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Hugging Face Inference API error:', response.status, errorText)
          console.error('Endpoint used:', inferenceEndpoint)
          set.status = response.status
          return { 
            error: `Hugging Face Inference API error: ${response.status}`,
            details: errorText 
          }
        }

        const result = await response.json()

        // Inference API returns array with label/score
        // Format: [{label: "neutral", score: ...}] or [{label: "negative", score: ...}] or [{label: "positive", score: ...}]
        const prediction = Array.isArray(result) ? result[0] : result
        
        // Validate prediction structure
        if (!prediction || !prediction.label || typeof prediction.score !== 'number') {
          console.error('Invalid prediction format:', prediction)
          set.status = 500
          return { 
            error: 'Invalid prediction format from model',
            details: JSON.stringify(prediction)
          }
        }

        // Map sentiment labels to outlier classification: negative = outlier, neutral/positive = normal
        const label = String(prediction.label).toLowerCase()
        const isOutlier = label === 'negative'

        return {
          id: body.id,
          title: body.title,
          prediction: {
            label: prediction.label, // "neutral", "negative", or "positive"
            score: prediction.score,
            isOutlier,
          },
        }
      } catch (error) {
        console.error('Hugging Face API error:', error)
        set.status = 500
        return { 
          error: 'Failed to get prediction from model',
          details: error instanceof Error ? error.message : String(error)
        }
      }
    },
    {
      body: t.Object({
        id: t.String(),
        title: t.String(),
      }),
    }
  )

export type App = typeof app

export const GET = async (request: Request) => {
  try {
    return await app.fetch(request)
  } catch (error) {
    console.error('Unhandled error in GET handler:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const POST = async (request: Request) => {
  try {
    return await app.fetch(request)
  } catch (error) {
    console.error('Unhandled error in POST handler:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

