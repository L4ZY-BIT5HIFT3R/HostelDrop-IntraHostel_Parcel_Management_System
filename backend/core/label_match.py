"""Auto-match helpers: parse a parcel label and rank candidate students.

Students are asked to put their recipient details into a single label field in
the form ``Name | Room | Roll`` (pipe-delimited). On intake a guard pastes or
scans that field and we:

1. parse it into ``name`` / ``room_number`` / ``roll_number`` (positional, with
   pattern-based fallback for short/garbled inputs), and
2. resolve it to a student — an exact roll-number match where possible, with a
   fuzzy name match as a fallback ranked list.

Everything here is pure (no I/O), so it is cheap to unit-test and the router can
stay thin.
"""
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional

from .config import ROLL_NUMBER_PATTERN, ROOM_NUMBER_PATTERN

LABEL_FIELD_DELIMITER = "|"

# A token is "roll-like" if it could be a roll number: alphanumeric/hyphen, holds
# at least one digit, and is reasonably long. Rooms are short, so we treat short
# tokens as rooms when disambiguating a 2-part label.
_MIN_ROLL_LENGTH = 4
_MAX_ROOM_LENGTH = 6


def _looks_like_roll(token: str) -> bool:
    return (
        bool(ROLL_NUMBER_PATTERN.fullmatch(token))
        and any(ch.isdigit() for ch in token)
        and len(token) >= _MIN_ROLL_LENGTH
    )


def _looks_like_room(token: str) -> bool:
    return bool(ROOM_NUMBER_PATTERN.fullmatch(token)) and len(token) <= _MAX_ROOM_LENGTH


def parse_label(raw: Optional[str]) -> Dict[str, Optional[str]]:
    """Split a ``Name | Room | Roll`` label into its parts.

    Falls back to pattern detection when the field count is off (e.g. a guard
    typed only a name, only a roll number, or dropped the room).
    """
    result: Dict[str, Optional[str]] = {"name": None, "room_number": None, "roll_number": None}
    if not raw:
        return result

    parts = [segment.strip() for segment in raw.split(LABEL_FIELD_DELIMITER)]
    parts = [segment for segment in parts if segment]
    if not parts:
        return result

    if len(parts) >= 3:
        # Canonical case. Honour position but recover if the roll/room columns
        # were swapped (roll-like value sitting in the room column).
        name, room, roll = parts[0], parts[1], parts[2]
        if not _looks_like_roll(roll) and _looks_like_roll(room):
            room, roll = roll, room
        result["name"] = name
        result["room_number"] = room
        result["roll_number"] = roll
        return result

    if len(parts) == 2:
        first, second = parts
        result["name"] = first
        if _looks_like_roll(second):
            result["roll_number"] = second
        else:
            result["room_number"] = second
        return result

    # Single token: a bare roll number, otherwise treat as a name to fuzzy-match.
    only = parts[0]
    if _looks_like_roll(only):
        result["roll_number"] = only
    else:
        result["name"] = only
    return result


def name_similarity(query: Optional[str], candidate: Optional[str]) -> float:
    """Case-insensitive fuzzy similarity in [0, 1] between two names."""
    if not query or not candidate:
        return 0.0
    a = " ".join(query.lower().split())
    b = " ".join(candidate.lower().split())
    if not a or not b:
        return 0.0
    base = SequenceMatcher(None, a, b).ratio()
    # Reward token containment ("bittu" within "bittu kumar") which the raw
    # ratio under-counts for short queries against longer full names.
    a_tokens = set(a.split())
    b_tokens = set(b.split())
    if a_tokens and a_tokens.issubset(b_tokens):
        base = max(base, 0.9)
    return round(base, 4)


def rank_candidates(
    parsed: Dict[str, Optional[str]],
    students: List[Dict[str, Any]],
    *,
    limit: int = 5,
    threshold: float = 0.45,
) -> List[Dict[str, Any]]:
    """Rank students by fuzzy name similarity to the parsed label name.

    ``students`` are plain dicts with ``name`` / ``roll_number`` / ``room_number``.
    Each returned candidate carries a ``score`` and, when the label included a
    room, a ``room_matches`` flag to surface mismatches to the guard.
    """
    query_name = parsed.get("name")
    parsed_room = (parsed.get("room_number") or "").strip().lower()
    scored: List[Dict[str, Any]] = []

    for student in students:
        score = name_similarity(query_name, student.get("name"))
        if score < threshold:
            continue
        student_room = (student.get("room_number") or "").strip().lower()
        room_matches: Optional[bool] = None
        if parsed_room and student_room:
            room_matches = parsed_room == student_room
            if room_matches:
                score = min(1.0, score + 0.05)
        scored.append(
            {
                "roll_number": student.get("roll_number"),
                "name": student.get("name"),
                "room_number": student.get("room_number"),
                "score": round(score, 4),
                "room_matches": room_matches,
            }
        )

    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:limit]
