import csv
import numpy as np
from tqdm import tqdm
import yfinance as yf
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ============================================================
# 1. Optional: function to get historical data with yfinance
# ============================================================

def get_historical_data(ticker):
    """
    Fetches the full historical price data for a given ticker.

    Args:
        ticker (str): The stock ticker symbol.

    Returns:
        pandas.DataFrame or None: Historical data including Open, Close, High, Low, Volume.
    """
    try:
        data = yf.download(ticker, period="max", auto_adjust=False, threads=False)
        if data.empty:
            print(f"No data found for ticker: {ticker}")
            return None
        return data
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return None


# ============================================================
# 2. FinBERT setup (batched, with MPS/CPU device selection)
# ============================================================

MODEL_NAME = "ProsusAI/finbert"

# pick device: Apple GPU (MPS) if available, else CPU
if torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")

print("Using device:", device)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.to(device)
model.eval()  # inference mode


def finbert_sentiment_scores(texts, batch_size: int = 64) -> np.ndarray:
    """
    Compute FinBERT sentiment scores for a list of texts in batches.
    Returns a NumPy array of scores in [-1, 1].

    texts: list of str (news titles)
    batch_size: how many titles per forward pass
    """
    all_scores = []

    for i in tqdm(range(0, len(texts), batch_size), desc="Scoring sentiment with FinBERT"):
        batch_texts = texts[i:i + batch_size]

        enc = tokenizer(
            batch_texts,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=128,
        ).to(device)

        with torch.no_grad():
            outputs = model(**enc)
            probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()  # shape (B, 3)

        # FinBERT order: [negative, neutral, positive]
        # Map to [-1, 0, 1] and take expectation → scalar in [-1, 1]
        scores = probs @ np.array([-1.0, 0.0, 1.0])
        all_scores.extend(scores.tolist())

    return np.array(all_scores, dtype=float)


# ============================================================
# 3. Main pipeline
# ============================================================

if __name__ == "__main__":

    input_csv = "articles_with_11day_price_encoded.csv"
    output_csv = "articles_sentiment_zscores.csv"

    articles = []
    data = []

    # -----------------------------------------
    # 3.1 Read CSV: title + last 11 columns as prices
    # -----------------------------------------
    with open(input_csv, "r", newline="", encoding="utf-8") as csvfile:
        reader = csv.reader(csvfile, delimiter=",", quotechar='"')
        cols = next(reader)  # header
        for row in reader:
            # row[0] assumed title, last 11 columns are prices/features
            row_arr = np.array(row[-11:], dtype=float)
            articles.append(row[0])
            data.append(row_arr)

    data = np.array(data, dtype=float)
    articles = np.array(articles, dtype=object)

    print(f"Loaded {len(articles)} articles")

    # -----------------------------------------
    # 3.2 Compute z-scores for the 11-day windows
    #     shape of data: (N_samples, 11)
    # -----------------------------------------
    means = np.mean(data, axis=1)           # shape (N,)
    stds = np.std(data, axis=1)             # shape (N,)
    zscores = (data - means[:, None]) / stds[:, None]  # shape (N, 11)

    # -----------------------------------------
    # 3.3 Drop rows with invalid z-scores (NaN / inf)
    # -----------------------------------------
    valid_mask = np.all(np.isfinite(zscores), axis=1)
    num_dropped = np.sum(~valid_mask)

    if num_dropped > 0:
        print(f"Dropping {num_dropped} rows with invalid z-scores (NaN/inf).")

    zscores = zscores[valid_mask]
    data = data[valid_mask]
    articles = articles[valid_mask]

    print(f"Remaining valid rows: {len(articles)}")

    # -----------------------------------------
    # 3.4 Compute FinBERT sentiment for each title (batched)
    # -----------------------------------------
    labels = finbert_sentiment_scores(articles.tolist(), batch_size=64)  # shape (N,)

    # -----------------------------------------
    # 3.5 Simple histogram with NumPy (no plotting)
    # -----------------------------------------
    num_bins = 50
    hist_counts, bin_edges = np.histogram(labels, bins=num_bins)

    print("\nHistogram counts:")
    print(hist_counts)

    print("\nBin edges:")
    print(bin_edges)

    # -----------------------------------------
    # 3.6 Save title, sentiment_score, and z-scores to a new CSV
    # -----------------------------------------
    with open(output_csv, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL)
        header = ["title", "sentiment_score"] + [f"zscore_{i}" for i in range(11)]
        writer.writerow(header)

        for i in range(len(articles)):
            row = [articles[i], labels[i]] + zscores[i].tolist()
            writer.writerow(row)

    print(f"\nSaved output to: {output_csv}")
