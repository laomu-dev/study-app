from __future__ import annotations

import json
import random
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from html import unescape
from pathlib import Path
from xml.etree import ElementTree as ET

from pypdf import PdfReader


BASE_DIR = Path(r"C:\Users\28468\Desktop\省局题库")
API_BASE = "http://127.0.0.1:3001/api"
CATEGORY_NAME = "通信题库"

DIRECT_DOCX = [
    BASE_DIR / "2021年光网技能竞赛题库1-70%.docx",
    BASE_DIR / "2021年光网技能竞赛题库2-70%.docx",
    BASE_DIR / "温州题库（提供）.docx",
]

SKIPPED_PDFS = [
    BASE_DIR / "2022版《浙江传输局光网维护项目管理操作手册》.pdf",
    BASE_DIR / "GB 50374-2018_通信管道工程施工及验收标准.pdf",
    BASE_DIR / "GB 51171-2016 通信线路工程验收规范.pdf",
    BASE_DIR / "光接入网网络建设岗位技能认证教材（2015版）.pdf",
    BASE_DIR / "无人机应用基础题库.pdf",
]


def clean_text(text: str) -> str:
    text = unescape(text)
    text = text.replace("\u00a0", " ").replace("\u3000", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_docx_text(path: Path) -> str:
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    with zipfile.ZipFile(path) as zf:
        xml = zf.read("word/document.xml")
    root = ET.fromstring(xml)
    paragraphs: list[str] = []
    for para in root.findall(".//w:p", ns):
        pieces = [node.text or "" for node in para.findall(".//w:t", ns)]
        if pieces:
            paragraphs.append("".join(pieces))
    return clean_text("\n".join(paragraphs))


def extract_pdf_text(path: Path, max_pages: int | None = None) -> str:
    reader = PdfReader(str(path))
    pages = reader.pages if max_pages is None else reader.pages[:max_pages]
    text = "\n".join(page.extract_text() or "" for page in pages)
    return clean_text(text)


def normalize_key(text: str) -> str:
    return re.sub(r"\s+", "", text).replace("（", "(").replace("）", ")")


def split_single_choice_blocks(text: str) -> str:
    start = text.find("单选题")
    if start < 0:
        return ""
    end_candidates = [
        idx for marker in ["多选题", "判断题", "填空题"]
        for idx in [text.find(marker, start + 3)]
        if idx > start
    ]
    end = min(end_candidates) if end_candidates else len(text)
    return text[start:end]


OPTION_PATTERN = re.compile(r"([A-H])\s*[、.．]\s*", re.I)


def parse_options(option_text: str) -> list[str]:
    compact = re.sub(r"\s+", " ", option_text).strip()
    matches = list(OPTION_PATTERN.finditer(compact))
    options: list[str] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(compact)
        option = compact[start:end].strip(" ；;，,")
        if option:
            options.append(option)
    return options


def parse_direct_single_choice(text: str, source_name: str) -> list[dict]:
    section = split_single_choice_blocks(text)
    if not section:
        return []

    chunks = re.split(r"(?=【\s*[A-Ha-h]\s*】)|(?=\n\s*\d+\.\s*.+?【\s*[A-Ha-h]\s*】)", section)
    questions: list[dict] = []

    for raw_chunk in chunks:
        chunk = raw_chunk.strip()
        if not chunk or "单选题" in chunk and len(chunk) < 20:
            continue
        answer_match = re.search(r"【\s*([A-Ha-h])\s*】", chunk)
        if not answer_match:
            continue
        answer_letter = answer_match.group(1).upper()
        answer_index = ord(answer_letter) - ord("A")
        chunk = re.sub(r"【\s*[A-Ha-h]\s*】", "", chunk, count=1).strip()

        option_match = OPTION_PATTERN.search(chunk)
        if not option_match:
            continue
        content = chunk[:option_match.start()].strip()
        content = re.sub(r"^\d+\.\s*", "", content).strip()
        content = re.sub(r"\s+", " ", content)
        options = parse_options(chunk[option_match.start():])

        if not content or len(options) < 2 or answer_index >= len(options):
            continue

        questions.append({
            "content": content,
            "options": options,
            "correctAnswer": answer_index,
            "isMultiple": False,
            "type": "single",
            "explanation": f"来源：{source_name}，原题答案为 {answer_letter}。",
        })
    return questions


def split_section(text: str, marker: str) -> str:
    start = text.find(marker)
    if start < 0:
        return ""
    markers = ["填空题", "判断题", "单选题", "多选题"]
    end_candidates = [
        idx for item in markers
        for idx in [text.find(item, start + len(marker))]
        if idx > start
    ]
    end = min(end_candidates) if end_candidates else len(text)
    return text[start:end]


def parse_fill_to_single_choice(text: str, source_name: str) -> list[dict]:
    section = split_section(text, "填空题")
    if not section:
        return []

    candidates: list[tuple[str, str]] = []
    for raw in re.split(r"\n+", section):
        line = raw.strip()
        if not line or "填空题" in line:
            continue
        for match in re.finditer(r"（\s*([^（）]{1,30}?)\s*）", line):
            answer = match.group(1).strip()
            if not answer or answer in {" ", "，", "。"}:
                continue
            if re.search(r"[。；;]$", answer):
                continue
            stem = (line[:match.start()] + "（    ）" + line[match.end():]).strip()
            if 12 <= len(stem) <= 180:
                candidates.append((stem, answer))

    answer_pool = []
    for _, answer in candidates:
        if answer not in answer_pool:
            answer_pool.append(answer)

    questions: list[dict] = []
    for stem, answer in candidates:
        distractors: list[str]
        numeric = re.match(r"^(\d+(?:\.\d+)?)(.*)$", answer)
        if numeric:
            distractors = make_numeric_distractors(numeric.group(1), numeric.group(2))
        else:
            distractors = [item for item in answer_pool if item != answer and len(item) <= 18][:3]
        if len(distractors) < 3:
            continue
        options = [answer, *distractors[:3]]
        key = normalize_key(stem)
        random.Random(key).shuffle(options)
        questions.append({
            "content": f"根据《{source_name}》，{stem}",
            "options": options,
            "correctAnswer": options.index(answer),
            "isMultiple": False,
            "type": "single",
            "explanation": f"来源：{source_name}。原填空答案为：{answer}。",
        })
    return questions


def parse_judge_to_single_choice(text: str, source_name: str) -> list[dict]:
    section = split_section(text, "判断题")
    if not section:
        return []
    questions: list[dict] = []
    for match in re.finditer(r"【\s*([√×xX])\s*】\s*([^\n]+)", section):
        mark = match.group(1)
        statement = match.group(2).strip()
        if len(statement) < 8:
            continue
        correct = 0 if mark == "√" else 1
        questions.append({
            "content": f"判断正误：{statement}",
            "options": ["正确", "错误"],
            "correctAnswer": correct,
            "isMultiple": False,
            "type": "single",
            "explanation": f"来源：{source_name}。原判断题答案为：{'正确' if correct == 0 else '错误'}。",
        })
    return questions


NUMERIC_RE = re.compile(
    r"(?<![A-Za-z0-9])(\d+(?:\.\d+)?)(\s*(?:mm|cm|m|km|dB|db|kV|V|nm|h|小时|倍|%|％|天|日|年|分钟|秒))",
    re.I,
)


def split_sentences(text: str) -> list[str]:
    text = re.sub(r"\n+", "。", text)
    parts = re.split(r"(?<=[。；;])", text)
    cleaned: list[str] = []
    for part in parts:
        sentence = part.strip(" 。；;\n\r\t")
        sentence = re.sub(r"\s+", "", sentence)
        if 24 <= len(sentence) <= 150 and re.search(r"[\u4e00-\u9fff]", sentence):
            cleaned.append(sentence)
    return cleaned


def make_numeric_distractors(value: str, unit: str) -> list[str]:
    number = float(value)
    if number <= 0:
        candidates = [number + 1, number + 2, number + 3]
    elif number < 5:
        candidates = [number + 0.5, number + 1, max(0.1, number - 0.5)]
    elif number < 50:
        candidates = [number + 5, max(1, number - 5), number * 2]
    else:
        candidates = [number + 50, max(1, number - 50), number * 1.5]

    decimals = len(value.split(".")[1]) if "." in value else 0
    results: list[str] = []
    for candidate in candidates:
        formatted = f"{candidate:.{decimals}f}" if decimals else str(int(round(candidate)))
        option = f"{formatted}{unit.strip()}"
        if option not in results and option != f"{value}{unit.strip()}":
            results.append(option)
    return results[:3]


def generate_numeric_questions(text: str, source_name: str, quota: int) -> list[dict]:
    questions: list[dict] = []
    seen: set[str] = set()
    for sentence in split_sentences(text):
        if len(questions) >= quota:
            break
        if any(bad in sentence for bad in ["目录", "前言", "版权", "http", "www"]):
            continue
        matches = list(NUMERIC_RE.finditer(sentence))
        if not matches:
            continue
        match = matches[0]
        value, unit = match.group(1), match.group(2)
        correct = f"{value}{unit.strip()}"
        distractors = make_numeric_distractors(value, unit)
        if len(distractors) < 3:
            continue
        stem_sentence = sentence[:match.start()] + "（    ）" + sentence[match.end():]
        content = f"根据《{source_name}》，{stem_sentence}"
        key = normalize_key(content)
        if key in seen:
            continue
        seen.add(key)
        options = [correct, *distractors]
        rng = random.Random(key)
        rng.shuffle(options)
        questions.append({
            "content": content,
            "options": options,
            "correctAnswer": options.index(correct),
            "isMultiple": False,
            "type": "single",
            "explanation": f"资料原文：{sentence}",
        })
    return questions


def post_json(opener: urllib.request.OpenerDirector, url: str, data: dict) -> dict:
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with opener.open(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_json(opener: urllib.request.OpenerDirector, url: str) -> dict:
    with opener.open(url, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def import_questions(questions: list[dict]) -> dict:
    cookie_jar = urllib.request.HTTPCookieProcessor()
    opener = urllib.request.build_opener(cookie_jar)
    post_json(opener, f"{API_BASE}/auth/login", {"username": "admin", "password": "admin123"})

    categories = get_json(opener, f"{API_BASE}/questions/categories")["categories"]
    category = next((item for item in categories if item["name"] == CATEGORY_NAME), None)
    if not category:
        raise RuntimeError(f"Cannot find category: {CATEGORY_NAME}")

    category_id = category["id"]
    prepared = [{**question, "categoryId": category_id} for question in questions]
    result = post_json(opener, f"{API_BASE}/import/batch", {"questions": prepared})
    verify = get_json(opener, f"{API_BASE}/questions?categoryId={category_id}")["questions"]
    return {
        "categoryId": category_id,
        "importResult": result,
        "currentCategoryCount": len(verify),
    }


def main() -> int:
    print("starting provincial import", file=sys.stderr, flush=True)
    direct_questions: list[dict] = []
    generated_questions: list[dict] = []

    for path in DIRECT_DOCX:
        print(f"reading docx: {path.name}", file=sys.stderr, flush=True)
        text = extract_docx_text(path)
        parsed = parse_direct_single_choice(text, path.name)
        print(f"parsed direct: {len(parsed)}", file=sys.stderr, flush=True)
        direct_questions.extend(parsed)
        fill_generated = parse_fill_to_single_choice(text, path.name)
        judge_generated = parse_judge_to_single_choice(text, path.name)
        print(
            f"generated from docx fill/judge: {len(fill_generated) + len(judge_generated)}",
            file=sys.stderr,
            flush=True,
        )
        generated_questions.extend(fill_generated)
        generated_questions.extend(judge_generated)

    direct_unique: list[dict] = []
    seen: set[str] = set()
    for question in direct_questions:
        key = normalize_key(question["content"])
        if key in seen:
            continue
        seen.add(key)
        direct_unique.append(question)

    combined: list[dict] = []
    seen_combined: set[str] = set()
    for question in [*direct_unique, *generated_questions]:
        key = normalize_key(question["content"])
        if key in seen_combined:
            continue
        seen_combined.add(key)
        combined.append(question)

    output_path = Path("api/data/provincial-communication-questions.json")
    print(f"writing: {output_path}", file=sys.stderr, flush=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(combined, ensure_ascii=False, indent=2), encoding="utf-8")

    print("importing via api", file=sys.stderr, flush=True)
    import_result = import_questions(combined)
    report = {
        "directParsed": len(direct_questions),
        "directUnique": len(direct_unique),
        "generatedFromDocx": len(generated_questions),
        "generatedFromPdf": 0,
        "totalPrepared": len(combined),
        "savedTo": str(output_path),
        "skipped": [
            {"file": path.name, "reason": "PDF text extraction has questions/options but no reliable correct-answer marks"}
            for path in SKIPPED_PDFS
        ],
        **import_result,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
