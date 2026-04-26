#!/usr/bin/env python3
"""
从 TapTap《无尽冬日》官方公告抓取兑换码，合并写入 src/data/codes.json。
使用 webapiv2 JSON 接口（站点为 Nuxt CSR，直接爬 HTML 无效）。
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import requests

APP_ID = 521534
CODES_PATH = "src/data/codes.json"
# 公告列表分页（每日任务：覆盖近期官方帖即可）
FEED_PAGES = 5  # 5 * limit = 50 条
FEED_LIMIT = 10
# 仅当正文出现这些关键词时才解析兑换信息（减少无关请求时可改为先筛标题）
CONTENT_TRIGGERS = ("兑换码", "礼包码", "礼包", "CDK", "cdk", "兑换")


def build_xua() -> str:
    return (
        "V=1&PN=WebApp&LANG=zh_CN&VN_CODE=102&LOC=CN&PLT=PC&DS=PC"
        "&UID=github-actions-wjhelper&DT=PC"
    )


def session() -> requests.Session:
    s = requests.Session()
    s.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (compatible; WjHelper/1.0; +https://github.com) "
                "AppleWebKit/537.36 Chrome/120"
            ),
            "Referer": f"https://www.taptap.cn/app/{APP_ID}/topic?type=official",
        }
    )
    return s


def api_get(s: requests.Session, path: str, params: dict[str, Any]) -> dict[str, Any]:
    q = dict(params)
    q["X-UA"] = build_xua()
    url = f"https://www.taptap.cn{path}?{urlencode(q)}"
    r = s.get(url, timeout=30)
    r.raise_for_status()
    body = r.json()
    if not body.get("success"):
        raise RuntimeError(f"TapTap API error: {body}")
    return body["data"]


def fetch_group_id(s: requests.Session) -> int:
    data = api_get(s, "/webapiv2/group/v1/detail", {"app_id": APP_ID, "show_signup": "false"})
    return int(data["group"]["id"])


def fetch_feed_page(s: requests.Session, group_id: int, from_offset: int) -> tuple[list[dict], str | None]:
    data = api_get(
        s,
        "/webapiv2/feed/v7/by-group",
        {
            "type": "official",
            "group_id": group_id,
            "sort": "created",
            "limit": FEED_LIMIT,
            "status": 0,
            "from": from_offset,
        },
    )
    nxt = data.get("next_page")
    return list(data.get("list") or []), nxt


def fetch_topic_detail(s: requests.Session, topic_id: str) -> dict[str, Any]:
    return api_get(s, "/webapiv2/topic/v1/detail", {"id": topic_id})


def parse_level(text: str) -> tuple[int, str | None]:
    """返回 (等级数字, 原始描述片段)。"""
    patterns = [
        r"大熔炉(?:等)?级[^\d]{0,12}(\d+)\s*级",
        r"熔炉[^\d]{0,12}(\d+)\s*级",
        r"等级(?:要求)?[：:][^\d]{0,16}(\d+)\s*级",
        r"(?:大于等于|不低于|至少|需达到|达到)\s*(\d+)\s*级",
        r"(\d+)\s*级(?:以上|及以上)?",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            note = m.group(0).strip()
            return int(m.group(1)), note[:120]
    return 0, None


def parse_valid_until(text: str) -> str | None:
    m = re.search(
        r"有效期至[：:\s]*(\d{4})[年\-/]?(\d{1,2})[月\-/]?(\d{1,2})日?\s*(\d{1,2}:\d{2}:\d{2})?",
        text,
    )
    if not m:
        m2 = re.search(r"有效期[：:\s]*(\d{4}-\d{2}-\d{2})[^\d\n]*(\d{2}:\d{2}:\d{2})?", text)
        if m2:
            d = m2.group(1)
            t = m2.group(2) or "23:59:59"
            return f"{d}T{t}+08:00"
        return None
    y, mo, d, t = m.group(1), m.group(2), m.group(3), m.group(4)
    if t:
        return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}T{t}+08:00"
    return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}T23:59:59+08:00"


def is_plausible_code(code: str) -> bool:
    c = code.strip()
    if not c or len(c) > 40:
        return False
    if re.fullmatch(r"\d+", c) and len(c) < 6:
        return False
    if re.fullmatch(r"[A-Za-z0-9]+", c) and len(c) < 5:
        return False
    return True


def extract_code_spans(text: str) -> list[tuple[str, str]]:
    """
    从正文中提取 (兑换码, 局部上下文)。
    支持「兑换码 XXX 有效期…」及行内礼包码列表（英文大写+数字）。
    """
    spans: list[tuple[str, str]] = []

    for m in re.finditer(
        r"(?:礼包码|兑换码)\s*[：:＝]?\s*([^\n有效期至]+?)(?=\s*(?:有效期|兑换要求|$))",
        text,
        flags=re.MULTILINE,
    ):
        raw = m.group(1).strip()
        raw = re.split(r"[，,\s]+注意", raw)[0].strip()
        for piece in re.split(r"[，,、\s]+", raw):
            piece = piece.strip()
            if 2 <= len(piece) <= 32:
                ctx = text[max(0, m.start() - 40) : m.end() + 80]
                spans.append((piece, ctx))

    for m in re.finditer(
        r"(?:福利兑换码|通用兑换码|兑换码)[：:]\s*([A-Za-z0-9，,、\s]+)",
        text,
    ):
        chunk = m.group(1)
        for piece in re.split(r"[，,、\s]+", chunk):
            p = piece.strip()
            if re.fullmatch(r"[A-Za-z0-9]{6,20}", p):
                ctx = text[max(0, m.start() - 20) : m.end() + 60]
                spans.append((p.upper(), ctx))

    for m in re.finditer(r"\b([A-Z]{2,}[A-Z0-9]{5,22})\b", text):
        token = m.group(1)
        if len(token) > 24:
            continue
        ctx = text[max(0, m.start() - 30) : m.end() + 30]
        if any(k in ctx for k in ("兑换", "礼包", "码", "CDK", "cdk")):
            spans.append((token, ctx))

    dedup: list[tuple[str, str]] = []
    seen: set[str] = set()
    for code, ctx in spans:
        c = code.strip()
        if not is_plausible_code(c):
            continue
        key = c.upper() if c.isascii() else c
        if key in seen:
            continue
        seen.add(key)
        dedup.append((c, ctx))
    return dedup


def normalize_record(
    code: str,
    topic_title: str,
    source_url: str,
    topic_id: str,
    publish_ts: int | None,
    full_text: str,
    local_ctx: str,
) -> dict[str, Any]:
    level, level_note = parse_level(local_ctx if len(local_ctx) < len(full_text) else full_text)
    valid_until = parse_valid_until(local_ctx) or parse_valid_until(full_text)

    end_iso: str | None = None
    if valid_until:
        try:
            end_dt = datetime.fromisoformat(valid_until)
            end_iso = end_dt.astimezone(timezone.utc).isoformat()
        except ValueError:
            end_iso = valid_until

    pub_iso: str | None = None
    if publish_ts:
        pub_iso = datetime.fromtimestamp(publish_ts, tz=timezone.utc).isoformat()

    return {
        "code": code.strip(),
        "reward": "",
        "level_requirement": level,
        "level_note": level_note or "",
        "start_time": pub_iso or datetime.now(timezone.utc).isoformat(),
        "end_time": end_iso or "",
        "valid_until_display": valid_until or "",
        "other_requirements": level_note or "以游戏内公告为准",
        "announcement_title": topic_title,
        "topic_id": topic_id,
        "source": source_url,
        "date_added": datetime.now(timezone.utc).isoformat(),
    }


def load_store() -> dict[str, Any]:
    try:
        with open(CODES_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except FileNotFoundError:
        return {"meta": {}, "codes": []}

    if isinstance(raw, list):
        return {
            "meta": {"migrated_from": "array", "last_scrape_at": None},
            "codes": raw,
        }
    if isinstance(raw, dict) and "codes" in raw:
        return raw
    return {"meta": {}, "codes": []}


def save_store(store: dict[str, Any]) -> None:
    store.setdefault("meta", {})
    store["meta"].pop("migrated_from", None)
    store["meta"]["last_scrape_at"] = datetime.now(timezone.utc).isoformat()
    store["meta"]["source"] = "TapTap 官方公告"
    store["meta"]["feed_url"] = f"https://www.taptap.cn/app/{APP_ID}/topic?type=official"
    with open(CODES_PATH, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def main() -> int:
    s = session()
    group_id = fetch_group_id(s)

    topic_ids: list[tuple[str, str, str | None, int | None]] = []
    for page in range(FEED_PAGES):
        items, _ = fetch_feed_page(s, group_id, page * FEED_LIMIT)
        if not items:
            break
        for it in items:
            moment = it.get("moment") or {}
            topic = moment.get("topic") or {}
            tid = topic.get("id_str")
            title = (topic.get("title") or "").strip()
            if not tid:
                continue
            share = (moment.get("sharing") or {}).get("url")
            topic_ids.append((tid, title, share, moment.get("publish_time")))

    scraped: list[dict[str, Any]] = []
    for topic_id, title, share_url, publish_ts in topic_ids:
        detail = fetch_topic_detail(s, topic_id)
        fp = (detail.get("first_post") or {}).get("contents") or {}
        raw_text = (fp.get("raw_text") or "").strip()
        if not raw_text:
            continue
        if not any(t in raw_text for t in CONTENT_TRIGGERS) and not any(
            t in title for t in ("兑换", "礼包", "CDK")
        ):
            continue

        moment = detail.get("moment") or {}
        source_url = share_url or (moment.get("sharing") or {}).get("url") or f"https://www.taptap.cn/topic/{topic_id}"

        for code, ctx in extract_code_spans(raw_text):
            scraped.append(
                normalize_record(
                    code=code,
                    topic_title=title,
                    source_url=source_url,
                    topic_id=topic_id,
                    publish_ts=publish_ts,
                    full_text=raw_text,
                    local_ctx=ctx,
                )
            )

    store = load_store()
    existing: list[dict[str, Any]] = list(store.get("codes") or [])
    by_code: dict[str, dict[str, Any]] = {c["code"]: c for c in existing}

    new_count = 0
    for rec in scraped:
        c = rec["code"]
        prev = by_code.get(c)
        if prev is None:
            by_code[c] = rec
            new_count += 1
        else:
            if rec.get("end_time"):
                prev["end_time"] = rec["end_time"]
            if "valid_until_display" in rec:
                prev["valid_until_display"] = rec.get("valid_until_display", "")
            if rec.get("announcement_title"):
                prev["announcement_title"] = rec["announcement_title"]
            if rec.get("source"):
                prev["source"] = rec["source"]
            if rec.get("topic_id"):
                prev["topic_id"] = rec["topic_id"]
            if rec.get("level_requirement", 0) >= prev.get("level_requirement", 0):
                prev["level_requirement"] = rec["level_requirement"]
                prev["level_note"] = rec.get("level_note", "")
            if rec.get("other_requirements"):
                prev["other_requirements"] = rec["other_requirements"]

    cleaned = {k: v for k, v in by_code.items() if is_plausible_code(k)}
    store["codes"] = sorted(
        cleaned.values(),
        key=lambda x: (x.get("start_time") or "", x.get("code") or ""),
        reverse=True,
    )
    save_store(store)

    print(
        f"group_id={group_id} topics_scanned={len(topic_ids)} "
        f"parsed_entries={len(scraped)} new_or_updated={new_count} total={len(store['codes'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
