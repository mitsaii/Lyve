#!/usr/bin/env bash
# Auto-run wrapper — double-click to execute scraper
cd "$(dirname "$0")"
bash scripts/run_daily_scraper.sh
echo ""
echo "Press any key to close..."
read -n 1
