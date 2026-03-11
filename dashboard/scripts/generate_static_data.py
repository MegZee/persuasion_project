#!/usr/bin/env python3
"""
Utility script to pre-compute all data required by the static frontend.

It ingests the original CSV located under backend/data/, derives the metrics
that were previously calculated on the Flask API, and writes a compact JSON
payload to public/data/preprocessed-data.json. Run this script whenever the
source dataset is updated.
"""

import ast
import csv
import json
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_CSV = PROJECT_ROOT / "backend" / "data" / "2022_aus_elections_mar_to_may_29_persuasion_party_tokenized.csv"
OUTPUT_PATH = PROJECT_ROOT / "public" / "data" / "preprocessed-data.json"


DEFAULT_START = datetime(2022, 2, 27)
DEFAULT_END = datetime(2022, 6, 1)

REGIONS = [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
    "Tasmania",
    "Australian Capital Territory",
    "Northern Territory",
]
REGION_INDEX = {region: idx for idx, region in enumerate(REGIONS)}

GENDERS = ["male", "female"]
GENDER_INDEX = {v: idx for idx, v in enumerate(GENDERS)}

AGE_BUCKETS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
AGE_INDEX = {v: idx for idx, v in enumerate(AGE_BUCKETS)}


def safe_eval(value):
    if value is None or value == "":
        return None
    try:
        return ast.literal_eval(value)
    except (SyntaxError, ValueError):
        return None


def assign_macro_party(party_value: str | None) -> str:
    if not party_value or party_value.lower() in {"", "nan"}:
        return "No_Affiliation"
    value = party_value.strip()
    if value in {"Liberal", "Liberal Nationals (QLD)", "Nationals", "Country Liberal (NT)", "New Liberals"}:
        return "Liberal"
    if value == "Labor":
        return "Labor"
    if value == "Greens":
        return "Greens"
    if value == "Independent":
        return "Independents"
    return "Other"


def parse_float(raw: str | None) -> float:
    if raw is None or raw == "":
        return 0.0
    try:
        return float(raw)
    except ValueError:
        return 0.0


def parse_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.strptime(raw[:10], "%Y-%m-%d")
    except ValueError:
        return None


def round_value(value: float, digits: int = 3) -> float:
    if value == 0:
        return 0.0
    return round(value, digits)


def compute_moving_average(sorted_rows, key):
    values = [row[key] for row in sorted_rows]
    window = []
    result = []
    for idx, val in enumerate(values):
        window.append(val)
        if len(window) > 3:
            window.pop(0)
        if len(window) < 3:
            result.append(None)
        else:
            result.append(sum(window) / 3.0)
    return result


def build_time_series(party_daily_totals):
    timeseries_output = {}
    metric_keys = [
        "mean_impressions_total",
        "mean_impressions_high_persuasive",
        "mean_impressions_low_persuasive",
        "mean_spend_total",
        "mean_spend_high_persuasive",
        "mean_spend_low_persuasive",
    ]

    for party, daily_map in party_daily_totals.items():
        sorted_dates = sorted(daily_map.keys())
        rows = []
        for date_key in sorted_dates:
            day_entry = daily_map[date_key]
            rows.append(
                {
                    key: day_entry.get(key, 0.0)
                    for key in metric_keys
                }
            )

        moving_averages = {
            key: compute_moving_average(rows, key) for key in metric_keys
        }

        party_series = []
        for idx, date_str in enumerate(sorted_dates):
            entry = {
                "date": date_str,
                "total_impressions": moving_averages["mean_impressions_total"][idx],
                "high_persuasive_impressions": moving_averages["mean_impressions_high_persuasive"][idx],
                "low_persuasive_impressions": moving_averages["mean_impressions_low_persuasive"][idx],
                "total_spend": moving_averages["mean_spend_total"][idx],
                "high_persuasive_spend": moving_averages["mean_spend_high_persuasive"][idx],
                "low_persuasive_spend": moving_averages["mean_spend_low_persuasive"][idx],
            }

            # Replace NaN with None for JSON compatibility.
            for key, value in entry.items():
                if isinstance(value, float) and math.isnan(value):
                    entry[key] = None
                elif isinstance(value, float):
                    entry[key] = round_value(value, 4)
            party_series.append(entry)

        timeseries_output[party] = party_series

    return timeseries_output


def main() -> None:
    if not SOURCE_CSV.exists():
        if OUTPUT_PATH.exists():
            print(
                f"Source CSV not found at {SOURCE_CSV}; "
                "skipping regeneration and reusing existing static dataset."
            )
            return
        raise FileNotFoundError(f"Source CSV not found at {SOURCE_CSV}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    ads_output = []

    # party -> date -> metrics
    party_daily_totals: dict[str, dict[str, dict[str, float]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))

    with SOURCE_CSV.open(newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)

        for row in reader:
            start_date = parse_date(row.get("ad_delivery_start_time"))
            stop_date = parse_date(row.get("ad_delivery_stop_time"))
            if start_date is None or stop_date is None:
                continue

            if start_date < DEFAULT_START or stop_date > DEFAULT_END:
                continue

            id_value = row.get("id")
            if not id_value:
                continue

            mean_spend = parse_float(row.get("mean_spend"))
            mean_impressions = parse_float(row.get("mean_impressions"))
            persuasive_ratio = parse_float(row.get("persuasive_ratio"))
            funding_entity = (row.get("funding_entity") or "").strip()

            macro_party = assign_macro_party(row.get("party"))

            high_persuasive = persuasive_ratio > 0.8
            low_persuasive = persuasive_ratio < 0.2

            duration_days = (stop_date - start_date).days

            # Region aggregation
            region_entries = []
            raw_region_distribution = safe_eval(row.get("region_distribution"))
            if isinstance(raw_region_distribution, list):
                for item in raw_region_distribution:
                    region_name = item.get("region")
                    if region_name not in REGION_INDEX:
                        continue

                    percentage = parse_float(item.get("percentage"))
                    if percentage <= 0:
                        continue
                    region_idx = REGION_INDEX[region_name]
                    impressions_contribution = mean_impressions * percentage
                    spend_contribution = mean_spend * percentage
                    region_entries.append([
                        region_idx,
                    round_value(impressions_contribution),
                    round_value(spend_contribution),
                    ])

            # Demographics aggregation
            gender_values: dict[int, float] = defaultdict(float)
            age_values: dict[int, float] = defaultdict(float)
            raw_demo_distribution = safe_eval(row.get("demographic_distribution"))
            if isinstance(raw_demo_distribution, list):
                for item in raw_demo_distribution:
                    age = item.get("age")
                    gender = item.get("gender")
                    if age == "13-17" or gender == "unknown":
                        continue
                    percentage = parse_float(item.get("percentage"))
                    if percentage <= 0:
                        continue
                    impressions_contribution = mean_impressions * percentage

                    if gender in GENDER_INDEX:
                        gender_idx = GENDER_INDEX[gender]
                        gender_values[gender_idx] += impressions_contribution
                    if age in AGE_INDEX:
                        age_idx = AGE_INDEX[age]
                        age_values[age_idx] += impressions_contribution

            gender_entries = [
                [idx, round_value(total)] for idx, total in gender_values.items()
            ]
            age_entries = [
                [idx, round_value(total)] for idx, total in age_values.items()
            ]

            ads_output.append(
                {
                    "id": id_value,
                    "macroParty": macro_party,
                    "startDate": start_date.strftime("%Y-%m-%d"),
                    "endDate": stop_date.strftime("%Y-%m-%d"),
                    "meanSpend": round_value(mean_spend),
                    "meanImpressions": round_value(mean_impressions),
                    "persuasiveRatio": round_value(persuasive_ratio, 4),
                    "highPersuasive": high_persuasive,
                    "lowPersuasive": low_persuasive,
                    "fundingEntity": funding_entity,
                    "durationDays": duration_days,
                    "regionData": region_entries,
                    "genderData": gender_entries,
                    "ageData": age_entries,
                }
            )

            # Time series expansion
            num_days = (stop_date - start_date).days + 1
            if num_days <= 0:
                num_days = 1
            spend_per_day = mean_spend / num_days if num_days else 0.0
            impressions_per_day = mean_impressions / num_days if num_days else 0.0

            current_date = start_date
            while current_date <= stop_date:
                date_key = current_date.strftime("%Y-%m-%d")

                for key_party in (macro_party, "All"):
                    totals = party_daily_totals[key_party][date_key]
                    totals["mean_spend_total"] += spend_per_day
                    totals["mean_impressions_total"] += impressions_per_day
                    if high_persuasive:
                        totals["mean_spend_high_persuasive"] += spend_per_day
                        totals["mean_impressions_high_persuasive"] += impressions_per_day
                    if low_persuasive:
                        totals["mean_spend_low_persuasive"] += spend_per_day
                        totals["mean_impressions_low_persuasive"] += impressions_per_day
                current_date += timedelta(days=1)

    timeseries_output = build_time_series(party_daily_totals)

    output_payload = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": str(SOURCE_CSV.name),
        },
        "regions": REGIONS,
        "genders": GENDERS,
        "ages": AGE_BUCKETS,
        "ads": ads_output,
        "timeSeries": timeseries_output,
    }

    with OUTPUT_PATH.open("w", encoding="utf-8") as outfile:
        json.dump(output_payload, outfile, separators=(",", ":"), ensure_ascii=False)

    print(f"Wrote static dataset for {len(ads_output)} ads to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
