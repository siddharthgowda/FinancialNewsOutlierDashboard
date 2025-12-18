import os
import pandas as pd
import numpy as np
from tqdm import tqdm


def get_local_history(ticker, data_dir):
    file_path = os.path.join(data_dir, f"{ticker}.csv")
    if not os.path.exists(file_path):
        return None

    try:
        df = pd.read_csv(file_path)

        # Find date column
        date_col = None
        for cand in ["date", "Date", "DATE"]:
            if cand in df.columns:
                date_col = cand
                break
        if date_col is None:
            return None

        # Normalize dates to tz-naive daily index
        df[date_col] = pd.to_datetime(df[date_col], utc=True)
        df[date_col] = df[date_col].dt.tz_convert(None).dt.normalize()
        df = df.set_index(date_col)

        # Normalize OHLC column names
        rename_map = {}
        for col in df.columns:
            lower = col.lower()
            if lower == "open":
                rename_map[col] = "Open"
            elif lower == "high":
                rename_map[col] = "High"
            elif lower == "low":
                rename_map[col] = "Low"
            elif lower == "close":
                rename_map[col] = "Close"

        df = df.rename(columns=rename_map)

        needed = ["Open", "High", "Low", "Close"]
        if not set(needed).issubset(df.columns):
            return None

        # Keep only OHLC
        df = df[needed].copy()

        return df

    except Exception:
        return None

input_csv = r"C:\Users\ricky\Downloads\All_external.csv"
data_dir  = r"C:\Users\ricky\OneDrive\桌面\full_history"

df_news = pd.read_csv(input_csv)

# Normalize article dates
df_news["Date"] = pd.to_datetime(df_news["Date"], utc=True)
df_news["Date"] = df_news["Date"].dt.tz_convert(None).dt.normalize()

tickers = df_news["Stock_symbol"].dropna().unique()

price_data = {}
for ticker in tqdm(tickers, desc="Loading stock data"):
    hist = get_local_history(ticker, data_dir)
    if hist is not None and not hist.empty:
        price_data[ticker] = hist

print("Loaded stock histories:", len(price_data))
if price_data:
    any_ticker = next(iter(price_data.keys()))
    df_sample = price_data[any_ticker]
    print(f"Example ticker: {any_ticker}")
    print(f"Price date range: {df_sample.index.min()} -> {df_sample.index.max()}")
    print(f"News date range: {df_news['Date'].min()} -> {df_news['Date'].max()}")

tau = 0.01

def compute_label(r):
    if r >= tau:
        return 1
    elif r <= -tau:
        return -1
    else:
        return 0


results = []

# simple stats (optional)
stats = {
    "no_ticker": 0,
    "no_t0_nearest": 0,
    "no_t3_after": 0,
    "success": 0,
}

pbar = tqdm(df_news.iterrows(), total=len(df_news), desc="Generating labels")

for _, row in pbar:
    pbar.set_postfix(success=stats["success"])
    title  = row["Article_title"]
    ticker = row["Stock_symbol"]
    date   = row["Date"]

    # 1) must have price data
    if ticker not in price_data:
        stats["no_ticker"] += 1
        continue

    df_stock = price_data[ticker]
    idx_dates = df_stock.index

    insert_pos = idx_dates.searchsorted(date, side="left")

    if insert_pos == 0:
        t0_pos = 0
    elif insert_pos == len(idx_dates):
        t0_pos = len(idx_dates) - 1
    else:
        # choose closer of previous or next trading day
        prev_date = idx_dates[insert_pos - 1]
        next_date = idx_dates[insert_pos]
        if abs(date - prev_date) <= abs(next_date - date):
            t0_pos = insert_pos - 1
        else:
            t0_pos = insert_pos

    if t0_pos < 0 or t0_pos >= len(df_stock):
        stats["no_t0_nearest"] += 1
        continue

    target = date + pd.Timedelta(days=3)
    t3_pos = idx_dates.searchsorted(target, side="left")

    if t3_pos >= len(idx_dates):
        stats["no_t3_after"] += 1
        continue

    p0_open  = df_stock.iloc[t0_pos]["Open"]
    p3_close = df_stock.iloc[t3_pos]["Close"]

    # Protect against weird zeros
    if p0_open == 0 or pd.isna(p0_open) or pd.isna(p3_close):
        continue

    r = (p3_close - p0_open) / p0_open
    label = compute_label(r)

    results.append({
        "Article_title": title,
        "Label": label
    })

    stats["success"] += 1
    if stats["success"] % 100000 == 0:
        print("Interim stats:", stats)


df_out = pd.DataFrame(results)
output_csv = "news_labels_open_vs_close_h3_tau001.csv"
df_out.to_csv(output_csv, index=False)

print("\n================ STATS ================")
for k, v in stats.items():
    print(f"{k}: {v}")

print(f"\nSaved final labeled dataset to: {output_csv}")
print(f"Total valid labeled samples: {len(df_out)}")
