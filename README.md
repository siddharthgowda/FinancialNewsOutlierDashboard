# Financial News Dashboard

A real-time financial news dashboard that analyzes stock market headlines using a fine-tuned FinBERT model to identify potential outliers and market-moving events.

## Overview

This dashboard fetches financial news from the Massive.com News API and uses a custom Hugging Face FinBERT model to predict whether news articles represent normal market activity or potential outliers. Built with Next.js 16, it provides a clean, modern interface for monitoring financial news and understanding sentiment patterns.

## Features

- **Real-time News Fetching**: Automatically fetches news from the last 24 hours for any of 100+ predefined stock tickers
- **AI-Powered Predictions**: Uses a fine-tuned FinBERT model (`siddharthgowda/EECS6893-finbert-stock-prediction`) to classify news as normal or outlier
- **Auto-Prediction**: Automatically analyzes new articles as they arrive with intelligent duplicate prevention
- **Live Polling**: Refreshes news data every 60 seconds to keep you up-to-date
- **Visual Analytics**: 
  - D3 stacked bar chart showing prediction distribution
  - Keyword frequency analysis highlighting top trending terms
- **Clean Dashboard UI**: Minimalist design with responsive layout

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **API Layer**: ElysiaJS for type-safe API routes
- **Data Fetching**: TanStack Query (React Query)
- **Visualization**: D3.js for custom charts
- **UI Components**: Shadcn UI with Tailwind CSS
- **ML Model**: Hugging Face Inference API (custom GCP endpoint)

## Getting Started

### Prerequisites

- Node.js 20+ (or Bun)
- API keys for:
  - Hugging Face (for model inference)
  - Massive.com/Polygon (for news data)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd financial_dashboard
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Create a `.env.local` file in the root directory:
```env
HUGGING_FACE_TOKEN=your_huggingface_token_here
POLYGON_API_KEY=your_massive_com_api_key_here
```

4. Start the development server:
```bash
bun dev
# or
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Select a stock ticker from the dropdown menu
2. The dashboard automatically fetches and analyzes news articles
3. View prediction results in the stacked bar chart (green = normal, red = outlier)
4. Browse individual articles in the table below
5. Check the keyword frequency table to see trending terms

## Project Structure

```
src/
├── app/
│   ├── api/[[...slugs]]/route.ts  # ElysiaJS API routes
│   ├── page.tsx                    # Main dashboard component
│   └── layout.tsx                  # App layout
├── components/
│   ├── stacked-bar-chart.tsx       # D3 prediction visualization
│   └── ui/                         # Shadcn UI components
├── hooks/
│   ├── use-news.ts                 # News fetching hook
│   └── use-prediction.ts           # Prediction mutation hook
├── constants/
│   └── tickers.ts                  # Stock ticker list
└── lib/
    └── query-client.tsx            # React Query configuration
```

## Model Details

The dashboard uses a custom fine-tuned FinBERT model hosted on Hugging Face:
- **Model**: `siddharthgowda/EECS6893-finbert-stock-prediction`
- **Endpoint**: Custom GCP Inference endpoint
- **Output**: Binary classification (0 = normal, 1 = outlier) with confidence scores

## Development

```bash
# Run development server
bun dev

# Build for production
bun run build

# Start production server
bun start

# Run linter
bun run lint
```

## License

This project is part of the EECS6893 Final Project at Columbia University.
