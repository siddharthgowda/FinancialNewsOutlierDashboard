# Financial News Dashboard

A real-time financial news dashboard that analyzes stock market headlines using a fine-tuned FinBERT model to predict stock price direction based on news content.

## Overview

This dashboard fetches financial news from the Massive.com News API and uses a custom Hugging Face FinBERT model to classify news articles and predict the likely direction of stock prices. The model classifies news as predicting positive, negative, or neutral stock movement. Built with Next.js 16, it provides a clean, modern interface for monitoring financial news and understanding how news might impact stock prices.

## Features

- **Real-time News Fetching**: Automatically fetches news from the last 24 hours for any of 100+ predefined stock tickers
- **AI-Powered Stock Direction Prediction**: Uses a fine-tuned FinBERT model to classify news articles and predict stock price direction (positive, negative, or neutral)
- **Auto-Prediction**: Automatically analyzes new articles as they arrive with intelligent duplicate prevention
- **Live Polling**: Refreshes news data every 60 seconds to keep you up-to-date
- **Visual Analytics**: 
  - D3 stacked bar chart showing distribution of predicted stock directions
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

**Note**: You must configure your own model inference endpoint. See the [Model Details](#model-details) section below.

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
3. View prediction results in the stacked bar chart (green = positive direction, gray = neutral, red = negative direction)
4. Browse individual articles in the table below to see predicted stock direction for each headline
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

**IMPORTANT**: You must use your own hosted model endpoint. The model endpoint referenced in this codebase is for demonstration purposes only and is not available for public use.

To use this dashboard, you must:
1. Deploy your own FinBERT model (or use a compatible model) to Hugging Face Inference API or your own hosting infrastructure
2. Update the inference endpoint URL in `src/app/api/[[...slugs]]/route.ts` to point to your own endpoint
3. Ensure your model returns predictions in the format: `[{label: "positive"|"negative"|"neutral", score: number}]`

The dashboard expects a three-class classification model that returns:
- **Output**: Classification with labels "positive", "negative", or "neutral" (predicting stock price direction) along with confidence scores

## Model Training

The model training code used to fine-tune the FinBERT model and other alternative models is available in the `model_training` folder. However, please note that this code was originally developed and run on Google Colab and is **not directly runnable** in this repository as-is.

To use the training code, you will need to:
- Set up your own training environment (Google Colab, local GPU setup, or cloud compute)
- Install the required dependencies and packages
- Configure paths for your dataset and model output locations
- Adjust any environment-specific settings and configurations

The training scripts are provided for reference and transparency about how the model was developed, but they require modifications to match your specific environment and setup.

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

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

2. **Model Endpoint Restriction**: Any model inference endpoints, API endpoints, or 
   hosted services referenced in this Software are provided for demonstration purposes 
   only. Users are strictly prohibited from using, accessing, or relying on any 
   endpoints or services owned or operated by the copyright holder. Users must deploy 
   and configure their own model inference endpoints and services. Any attempt to use 
   the copyright holder's endpoints or services without explicit written permission 
   constitutes a violation of this license.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.