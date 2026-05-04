#!/usr/bin/env bash
# 雙擊執行：清掉 DB 中的列表頁/網站文字假活動
# 第一次先預覽，確認後再加 --yes 真正刪除
cd "$(dirname "$0")"

echo "── 預覽要刪除的髒資料 ──"
python3 scripts/cleanup_fake_concerts.py
echo ""
read -p "確認要刪除以上資料嗎？(y/N) " yn
if [[ "$yn" =~ ^[Yy]$ ]]; then
  python3 scripts/cleanup_fake_concerts.py --yes
else
  echo "已取消，未做任何更動。"
fi
echo ""
echo "Press any key to close..."
read -n 1
