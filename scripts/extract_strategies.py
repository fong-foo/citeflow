#!/usr/bin/env python3
"""Extract all strategies from knowledge/papers/*.json → knowledge/strategies/all_strategies.json"""
import json, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAPERS_DIR = ROOT / "knowledge" / "papers"
STRATEGIES_DIR = ROOT / "knowledge" / "strategies"
OUTPUT = STRATEGIES_DIR / "all_strategies.json"

def main():
    if not PAPERS_DIR.exists():
        print(f"Papers directory not found: {PAPERS_DIR}")
        sys.exit(1)

    all_strategies = []
    paper_count = 0

    for paper_file in sorted(PAPERS_DIR.glob("paper_*.json")):
        with open(paper_file) as f:
            paper = json.load(f)
        paper_count += 1

        strategies = paper.get("extracted_strategies", [])
        for s in strategies:
            s["_paper_id"] = paper.get("paper_id", paper_file.stem)
            s["_arxiv"] = paper.get("arxiv", "")
            s["_title"] = paper.get("title", "")
            all_strategies.append(s)

    STRATEGIES_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(all_strategies, f, ensure_ascii=False, indent=2)

    # Stats
    by_category = {}
    for s in all_strategies:
        cat = s.get("category", "unknown")
        by_category[cat] = by_category.get(cat, 0) + 1

    print(f"Papers processed: {paper_count}")
    print(f"Total strategies extracted: {len(all_strategies)}")
    print(f"By category: {json.dumps(by_category, ensure_ascii=False)}")
    print(f"Output: {OUTPUT}")

    return len(all_strategies)

if __name__ == "__main__":
    count = main()
    if count < 120:
        print(f"WARNING: expected >= 120 strategies, got {count}")
        sys.exit(1)
