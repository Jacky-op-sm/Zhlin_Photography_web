#!/usr/bin/env python3
"""Update hobby monthlyDigest from Goodreads + Letterboxd RSS feeds.

Rules:
- Build latest 8 months.
- Reading: max 2 items/month from Goodreads.
- Films: keep all records from Letterboxd for each month.
- Keep wording concise; quote user's own review snippets directly when available.
"""

from __future__ import annotations

import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "web" / "data" / "site-content.json"
MAX_MONTHS = 8
MAX_READING_PER_MONTH = 2

FILM_TITLE_ZH = {
    "Cosmic Princess Kaguya!": "辉夜大小姐想让我告白：初吻不会结束",
    "An Autumn Afternoon": "秋刀鱼之味",
    "Miss Kobayashi's Dragon Maid: A lonely dragon wants to be loved": "小林家的龙女仆：寂寞的龙想被爱",
    "Scare Out": "惊蛰无声",
    "Nobody Knows": "无人知晓",
    "A Silent Voice: The Movie": "声之形",
    "Million Dollar Baby": "百万美元宝贝",
    "Shame": "羞耻",
    "Taxi Driver": "出租车司机",
    "Happy Together": "春光乍泄",
    "The Terror Live": "恐怖直播",
    "Bicycle Thieves": "偷自行车的人",
    "Ikiru": "生之欲",
    "Little Women": "小妇人",
    "Nymphomaniac: Vol. I": "女性瘾者：第一部",
    "Nymphomaniac: Vol. II": "女性瘾者：第二部",
    "Three Colours: Red": "红",
    "Three Colours: White": "白",
    "Three Colours: Blue": "蓝",
    "The Double Life of Véronique": "维罗妮卡的双重生命",
    "Tokyo Godfathers": "东京教父",
    "Crayon Shin-chan: My Moving Story! Cactus Large Attack!": "蜡笔小新：我的搬家物语 仙人掌大袭击",
    "Demon Slayer: Kimetsu no Yaiba Infinity Castle": "鬼灭之刃 无限城篇",
    "Kill Bill: Vol. 1": "杀死比尔1",
    "Kill Bill: Vol. 2": "杀死比尔2",
    "Memories of Matsuko": "被嫌弃的松子的一生",
    "A Sun": "阳光普照",
    "The Great Buddha+": "大佛普拉斯",
    "The Secret in Their Eyes": "谜一样的双眼",
    "The Wonderful Story of Henry Sugar": "亨利·休格的神奇故事",
}


def read_json(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8-sig")
    return json.loads(text)


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 HobbyDigestBot/1.0",
            "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def clean_html_text(text: str) -> str:
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def first_sentence(text: str, max_len: int = 78) -> str:
    if not text:
        return ""
    text = text.strip()
    for mark in ("。", "！", "？", ".", "!", "?"):
        pos = text.find(mark)
        if 0 < pos <= max_len:
            return text[: pos + 1]
    return (text[:max_len] + "…") if len(text) > max_len else text


def to_month(date_obj: datetime) -> str:
    return date_obj.strftime("%Y-%m")


def parse_gr_date(value: str) -> datetime | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return parsedate_to_datetime(value)
    except Exception:
        return None


def parse_lb_date(value: str) -> datetime | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except Exception:
        return None


def stars_from_rating(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    try:
        num = float(value)
    except ValueError:
        return ""
    full = int(num)
    half = abs(num - full - 0.5) < 1e-6
    stars = "★" * full
    if half:
        stars += "½"
    return stars


def format_film_name(title: str) -> str:
    title = (title or "").strip()
    if not title:
        return title
    if "（" in title and "）" in title:
        return title
    zh = FILM_TITLE_ZH.get(title)
    return f"{title}（{zh}）" if zh else title


def has_zh_mapping(title: str) -> bool:
    return title in FILM_TITLE_ZH


def extract_goodreads_user_id(url: str) -> str | None:
    m = re.search(r"/user/show/(\d+)", url or "")
    return m.group(1) if m else None


def extract_letterboxd_username(url: str) -> str | None:
    m = re.search(r"letterboxd\.com/([^/]+)/", url or "")
    return m.group(1) if m else None


def parse_goodreads_items(feed_xml: str) -> list[dict[str, Any]]:
    root = ET.fromstring(feed_xml)
    items = []
    for item in root.findall("./channel/item"):
        title = (item.findtext("title") or "").strip()
        rating = (item.findtext("user_rating") or "").strip()
        review = (item.findtext("user_review") or "").strip()
        shelves = (item.findtext("user_shelves") or "").strip()
        read_at = parse_gr_date(item.findtext("user_read_at") or "")
        added_at = parse_gr_date(item.findtext("user_date_added") or "")
        pub_at = parse_gr_date(item.findtext("pubDate") or "")

        if not title:
            continue
        if not read_at and "currently-reading" not in shelves:
            continue

        dt = read_at or added_at or pub_at
        if not dt:
            continue

        if review == "TBD":
            review = ""
        review = clean_html_text(review)

        date_text = dt.strftime("%Y-%m-%d")
        star_text = stars_from_rating(rating)
        if "currently-reading" in shelves and not read_at:
            prefix = "在读（Goodreads）"
        else:
            prefix = f"{date_text} 读完"
            if star_text:
                prefix += f"，{star_text}"
        prefix += "。"

        snippet = first_sentence(review, max_len=78)
        why = f"{prefix} {snippet}".strip() if snippet else prefix

        items.append(
            {
                "month": to_month(dt),
                "sort_ts": int(dt.timestamp()),
                "name": f"《{title}》" if not title.startswith("《") else title,
                "why": why,
            }
        )

    items.sort(key=lambda x: x["sort_ts"], reverse=True)
    return items


def parse_letterboxd_items(feed_xml: str) -> tuple[list[dict[str, Any]], list[str]]:
    root = ET.fromstring(feed_xml)
    items = []
    unmapped_titles: list[str] = []
    seen_unmapped: set[str] = set()
    ns = "{https://letterboxd.com}"
    for item in root.findall("./channel/item"):
        raw_film_title = (item.findtext(f"{ns}filmTitle") or "").strip()
        film_title = format_film_name(raw_film_title)
        watched = parse_lb_date(item.findtext(f"{ns}watchedDate") or "")
        rating = (item.findtext(f"{ns}memberRating") or "").strip()
        desc = clean_html_text(item.findtext("description") or "")

        if not film_title or not watched:
            continue
        if raw_film_title and not has_zh_mapping(raw_film_title) and raw_film_title not in seen_unmapped:
            seen_unmapped.add(raw_film_title)
            unmapped_titles.append(raw_film_title)

        star_text = stars_from_rating(rating)
        prefix = f"{watched.strftime('%Y-%m-%d')} 观看"
        if star_text:
            prefix += f"，{star_text}"
        prefix += "。"

        # Ignore generic "Watched on..." entries, keep real review snippets.
        if desc.startswith("Watched on "):
            snippet = ""
        else:
            snippet = first_sentence(desc, max_len=78)

        why = f"{prefix} {snippet}".strip() if snippet else prefix

        items.append(
            {
                "month": to_month(watched),
                "sort_ts": int(watched.timestamp()),
                "name": film_title,
                "why": why,
            }
        )

    items.sort(key=lambda x: x["sort_ts"], reverse=True)
    return items, unmapped_titles


def build_monthly_digest(
    gr_items: list[dict[str, Any]],
    lb_items: list[dict[str, Any]],
    max_months: int = MAX_MONTHS,
) -> list[dict[str, Any]]:
    gr_by_month: dict[str, list[dict[str, Any]]] = defaultdict(list)
    lb_by_month: dict[str, list[dict[str, Any]]] = defaultdict(list)
    month_set = set()

    for row in gr_items:
        month = row["month"]
        gr_by_month[month].append({"name": row["name"], "why": row["why"]})
        month_set.add(month)

    for row in lb_items:
        month = row["month"]
        lb_by_month[month].append({"name": row["name"], "why": row["why"]})
        month_set.add(month)

    months = sorted(month_set, reverse=True)[:max_months]
    digest: list[dict[str, Any]] = []
    for month in months:
        entry: dict[str, Any] = {"month": month}
        reading = gr_by_month.get(month, [])[:MAX_READING_PER_MONTH]
        # Keep full Letterboxd records for each month.
        # UI will collapse extra items under "查看本月更多".
        films = lb_by_month.get(month, [])
        if reading:
            entry["reading"] = reading
        if films:
            entry["films"] = films
        if reading or films:
            digest.append(entry)
    return digest


def main() -> None:
    data = read_json(DATA_PATH)
    hobby = data.get("hobby", {})
    profiles = hobby.get("externalProfiles", {})

    gr_profile = profiles.get("goodreads", "")
    lb_profile = profiles.get("letterboxd", "")

    gr_uid = extract_goodreads_user_id(gr_profile)
    lb_user = extract_letterboxd_username(lb_profile)
    if not gr_uid:
        raise SystemExit("Cannot parse Goodreads user id from hobby.externalProfiles.goodreads")
    if not lb_user:
        raise SystemExit("Cannot parse Letterboxd username from hobby.externalProfiles.letterboxd")

    gr_feed = fetch(f"https://www.goodreads.com/review/list_rss/{gr_uid}")
    lb_feed = fetch(f"https://letterboxd.com/{lb_user}/rss/")

    gr_items = parse_goodreads_items(gr_feed)
    lb_items, unmapped_titles = parse_letterboxd_items(lb_feed)
    digest = build_monthly_digest(gr_items, lb_items, max_months=MAX_MONTHS)

    hobby["monthlyDigest"] = digest
    data["hobby"] = hobby
    write_json(DATA_PATH, data)

    print(f"Updated monthlyDigest: {len(digest)} months")
    if digest:
        print("Range:", digest[0]["month"], "->", digest[-1]["month"])
    if unmapped_titles:
        print("Unmapped film titles:")
        for title in unmapped_titles:
            print("-", title)


if __name__ == "__main__":
    main()
