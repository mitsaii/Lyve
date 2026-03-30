#!/usr/bin/env bash
# run_daily_scraper.sh
# 每日演唱會爬蟲啟動腳本（由 macOS launchd 呼叫）
#
# 使用方式:
#   bash scripts/run_daily_scraper.sh          # 手動執行
#   自動執行: 由 launchd plist 每天 00:00 觸發

set -euo pipefail

# ── 定位專案根目錄 ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# ── Python 環境 ────────────────────────────────────────────────────────────────
# 優先使用 .venv；若不存在，退回系統 python3
if [ -f "$PROJECT_DIR/.venv/bin/python" ]; then
    PYTHON="$PROJECT_DIR/.venv/bin/python"
elif command -v python3 &>/dev/null; then
    PYTHON="$(command -v python3)"
else
    echo "[ERROR] 找不到 Python，請安裝 Python 3.9+" >&2
    exit 1
fi

# ── 日誌目錄 ──────────────────────────────────────────────────────────────────
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
TODAY="$(date +%Y%m%d)"
RUNNER_LOG="$LOG_DIR/runner_${TODAY}.log"

echo "========================================" | tee -a "$RUNNER_LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 啟動每日演唱會爬蟲" | tee -a "$RUNNER_LOG"
echo "Python: $PYTHON" | tee -a "$RUNNER_LOG"
echo "專案目錄: $PROJECT_DIR" | tee -a "$RUNNER_LOG"
echo "========================================" | tee -a "$RUNNER_LOG"

# ── 執行爬蟲 ─────────────────────────────────────────────────────────────────
"$PYTHON" "$PROJECT_DIR/scripts/daily_concert_scraper.py" \
    2>&1 | tee -a "$RUNNER_LOG"

EXIT_CODE=${PIPESTATUS[0]}

echo "" | tee -a "$RUNNER_LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 結束，exit code: $EXIT_CODE" | tee -a "$RUNNER_LOG"

# ── 清理 30 天以上的舊日誌 ────────────────────────────────────────────────────
find "$LOG_DIR" -name "*.log" -mtime +30 -delete 2>/dev/null || true
find "$PROJECT_DIR/data" -name "daily_*.json" -mtime +30 -delete 2>/dev/null || true
find "$PROJECT_DIR/data" -name "daily_*.sql"  -mtime +30 -delete 2>/dev/null || true

exit $EXIT_CODE
