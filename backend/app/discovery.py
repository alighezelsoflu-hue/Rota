import json
import math
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import Group, GroupMember, User

router = APIRouter()


class DiscoveryProfileIn(BaseModel):
    is_discoverable: bool = False
    city: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)
    latitude_approx: float | None = None
    longitude_approx: float | None = None
    radius_km: int = Field(default=25, ge=1, le=500)
    preferred_min_amount: float | None = Field(default=None, ge=0)
    preferred_max_amount: float | None = Field(default=None, ge=0)
    preferred_currency: str = Field(default="EUR", max_length=12)
    preferred_frequency: str = Field(default="monthly", max_length=40)
    bio: str | None = Field(default=None, max_length=1000)
    open_to_new_groups: bool = True


class GroupDiscoverySettingsIn(BaseModel):
    is_discoverable: bool = False
    looking_for_members: bool = False
    city: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)
    latitude_approx: float | None = None
    longitude_approx: float | None = None
    radius_km: int = Field(default=25, ge=1, le=500)
    open_slots: int = Field(default=0, ge=0, le=500)
    min_trust_score: int = Field(default=0, ge=0, le=100)
    message: str | None = Field(default=None, max_length=1000)


class ConnectionRequestIn(BaseModel):
    receiver_user_id: str
    message: str | None = Field(default=None, max_length=1000)


class RequestDecisionIn(BaseModel):
    decision: Literal["accepted", "declined", "blocked"]


class GroupJoinRequestIn(BaseModel):
    message: str | None = Field(default=None, max_length=1000)


class MemberReviewIn(BaseModel):
    group_id: str
    rating: int = Field(ge=1, le=5)
    tags: list[str] = Field(default_factory=list)
    note: str | None = Field(default=None, max_length=1500)
    visibility: Literal["group_only", "network"] = "network"


def new_id() -> str:
    return str(uuid.uuid4())


def safe_tags(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
        if isinstance(value, list):
            return [str(item) for item in value]
    except Exception:
        return []
    return []


def km_distance(lat1: float | None, lon1: float | None, lat2: float | None, lon2: float | None) -> float | None:
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None

    radius = 6371
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)

    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return round(radius * c, 1)


def require_group_member(db: Session, group_id: str, user_id: str) -> GroupMember:
    member = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
            GroupMember.status != "removed_before_start",
        )
    )
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    return member


def require_group_organizer(db: Session, group_id: str, user_id: str) -> GroupMember:
    member = require_group_member(db, group_id, user_id)
    if member.role not in {"organizer", "co_organizer"}:
        raise HTTPException(status_code=403, detail="Organizer role required")
    return member


def users_share_group(db: Session, reviewer_id: str, reviewed_id: str, group_id: str) -> bool:
    count = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM group_members a
            JOIN group_members b ON a.group_id = b.group_id
            WHERE a.user_id = :reviewer_id
              AND b.user_id = :reviewed_id
              AND a.group_id = :group_id
              AND a.status != 'removed_before_start'
              AND b.status != 'removed_before_start'
            """
        ),
        {
            "reviewer_id": reviewer_id,
            "reviewed_id": reviewed_id,
            "group_id": group_id,
        },
    ).scalar()

    return bool(count and count > 0)


def user_profile_row(db: Session, user_id: str):
    return db.execute(
        text(
            """
            SELECT *
            FROM discovery_profiles
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().first()


@router.get("/discovery/profile")
def get_my_discovery_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = user_profile_row(db, current_user.id)

    if not row:
        return {
            "user_id": current_user.id,
            "is_discoverable": False,
            "city": None,
            "country": None,
            "latitude_approx": None,
            "longitude_approx": None,
            "radius_km": 25,
            "preferred_min_amount": None,
            "preferred_max_amount": None,
            "preferred_currency": "EUR",
            "preferred_frequency": "monthly",
            "bio": None,
            "open_to_new_groups": True,
        }

    return dict(row)


@router.put("/discovery/profile")
def save_my_discovery_profile(
    payload: DiscoveryProfileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(
        text(
            """
            INSERT INTO discovery_profiles (
              user_id,
              is_discoverable,
              city,
              country,
              latitude_approx,
              longitude_approx,
              radius_km,
              preferred_min_amount,
              preferred_max_amount,
              preferred_currency,
              preferred_frequency,
              bio,
              open_to_new_groups,
              created_at,
              updated_at
            )
            VALUES (
              :user_id,
              :is_discoverable,
              :city,
              :country,
              :latitude_approx,
              :longitude_approx,
              :radius_km,
              :preferred_min_amount,
              :preferred_max_amount,
              :preferred_currency,
              :preferred_frequency,
              :bio,
              :open_to_new_groups,
              NOW(),
              NOW()
            )
            ON CONFLICT (user_id)
            DO UPDATE SET
              is_discoverable = EXCLUDED.is_discoverable,
              city = EXCLUDED.city,
              country = EXCLUDED.country,
              latitude_approx = EXCLUDED.latitude_approx,
              longitude_approx = EXCLUDED.longitude_approx,
              radius_km = EXCLUDED.radius_km,
              preferred_min_amount = EXCLUDED.preferred_min_amount,
              preferred_max_amount = EXCLUDED.preferred_max_amount,
              preferred_currency = EXCLUDED.preferred_currency,
              preferred_frequency = EXCLUDED.preferred_frequency,
              bio = EXCLUDED.bio,
              open_to_new_groups = EXCLUDED.open_to_new_groups,
              updated_at = NOW()
            """
        ),
        {
            "user_id": current_user.id,
            "is_discoverable": payload.is_discoverable,
            "city": payload.city,
            "country": payload.country,
            "latitude_approx": payload.latitude_approx,
            "longitude_approx": payload.longitude_approx,
            "radius_km": payload.radius_km,
            "preferred_min_amount": payload.preferred_min_amount,
            "preferred_max_amount": payload.preferred_max_amount,
            "preferred_currency": payload.preferred_currency.upper(),
            "preferred_frequency": payload.preferred_frequency,
            "bio": payload.bio,
            "open_to_new_groups": payload.open_to_new_groups,
        },
    )

    db.commit()

    return {"ok": True, "message": "Discovery profile saved."}


@router.get("/discovery/people")
def discover_people(
    radius_km: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_profile = user_profile_row(db, current_user.id)

    my_lat = my_profile["latitude_approx"] if my_profile else None
    my_lon = my_profile["longitude_approx"] if my_profile else None
    max_radius = radius_km or (my_profile["radius_km"] if my_profile else 100)

    rows = db.execute(
        text(
            """
            SELECT
              u.id AS user_id,
              u.name,
              u.email,
              u.trust_score,
              u.verification_status,
              p.city,
              p.country,
              p.latitude_approx,
              p.longitude_approx,
              p.radius_km,
              p.preferred_min_amount,
              p.preferred_max_amount,
              p.preferred_currency,
              p.preferred_frequency,
              p.bio,
              p.open_to_new_groups,
              COALESCE(AVG(r.rating), 0) AS average_rating,
              COUNT(r.id) AS review_count
            FROM discovery_profiles p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN member_reviews r ON r.reviewed_user_id = u.id AND r.visibility = 'network'
            WHERE p.is_discoverable = TRUE
              AND p.open_to_new_groups = TRUE
              AND p.user_id != :current_user_id
            GROUP BY
              u.id,
              u.name,
              u.email,
              u.trust_score,
              u.verification_status,
              p.city,
              p.country,
              p.latitude_approx,
              p.longitude_approx,
              p.radius_km,
              p.preferred_min_amount,
              p.preferred_max_amount,
              p.preferred_currency,
              p.preferred_frequency,
              p.bio,
              p.open_to_new_groups
            ORDER BY u.trust_score DESC, review_count DESC
            LIMIT 100
            """
        ),
        {"current_user_id": current_user.id},
    ).mappings().all()

    people = []

    for row in rows:
        distance = km_distance(my_lat, my_lon, row["latitude_approx"], row["longitude_approx"])

        if distance is not None and distance > max_radius:
            continue

        people.append(
            {
                **dict(row),
                "distance_km": distance,
                "display_location": ", ".join([value for value in [row["city"], row["country"]] if value]),
                "average_rating": round(float(row["average_rating"] or 0), 1),
                "review_count": int(row["review_count"] or 0),
            }
        )

    return people


@router.put("/groups/{group_id}/discovery-settings")
def save_group_discovery_settings(
    group_id: str,
    payload: GroupDiscoverySettingsIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    require_group_organizer(db, group_id, current_user.id)

    db.execute(
        text(
            """
            INSERT INTO group_discovery_settings (
              group_id,
              is_discoverable,
              looking_for_members,
              city,
              country,
              latitude_approx,
              longitude_approx,
              radius_km,
              open_slots,
              min_trust_score,
              message,
              created_at,
              updated_at
            )
            VALUES (
              :group_id,
              :is_discoverable,
              :looking_for_members,
              :city,
              :country,
              :latitude_approx,
              :longitude_approx,
              :radius_km,
              :open_slots,
              :min_trust_score,
              :message,
              NOW(),
              NOW()
            )
            ON CONFLICT (group_id)
            DO UPDATE SET
              is_discoverable = EXCLUDED.is_discoverable,
              looking_for_members = EXCLUDED.looking_for_members,
              city = EXCLUDED.city,
              country = EXCLUDED.country,
              latitude_approx = EXCLUDED.latitude_approx,
              longitude_approx = EXCLUDED.longitude_approx,
              radius_km = EXCLUDED.radius_km,
              open_slots = EXCLUDED.open_slots,
              min_trust_score = EXCLUDED.min_trust_score,
              message = EXCLUDED.message,
              updated_at = NOW()
            """
        ),
        {
            "group_id": group_id,
            "is_discoverable": payload.is_discoverable,
            "looking_for_members": payload.looking_for_members,
            "city": payload.city,
            "country": payload.country,
            "latitude_approx": payload.latitude_approx,
            "longitude_approx": payload.longitude_approx,
            "radius_km": payload.radius_km,
            "open_slots": payload.open_slots,
            "min_trust_score": payload.min_trust_score,
            "message": payload.message,
        },
    )

    db.commit()

    return {"ok": True, "message": "Group discovery settings saved."}


@router.get("/discovery/groups")
def discover_groups(
    radius_km: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_profile = user_profile_row(db, current_user.id)

    my_lat = my_profile["latitude_approx"] if my_profile else None
    my_lon = my_profile["longitude_approx"] if my_profile else None
    max_radius = radius_km or (my_profile["radius_km"] if my_profile else 100)

    rows = db.execute(
        text(
            """
            SELECT
              g.id AS group_id,
              g.name,
              g.contribution_amount,
              g.currency,
              g.frequency,
              g.member_limit,
              g.status,
              g.organizer_id,
              u.name AS organizer_name,
              u.trust_score AS organizer_trust_score,
              s.city,
              s.country,
              s.latitude_approx,
              s.longitude_approx,
              s.radius_km,
              s.open_slots,
              s.min_trust_score,
              s.message,
              COUNT(m.id) AS member_count,
              COALESCE(AVG(r.rating), 0) AS organizer_rating,
              COUNT(r.id) AS organizer_review_count
            FROM group_discovery_settings s
            JOIN groups g ON g.id = s.group_id
            JOIN users u ON u.id = g.organizer_id
            LEFT JOIN group_members m ON m.group_id = g.id AND m.status != 'removed_before_start'
            LEFT JOIN member_reviews r ON r.reviewed_user_id = u.id AND r.visibility = 'network'
            WHERE s.is_discoverable = TRUE
              AND s.looking_for_members = TRUE
              AND g.status IN ('forming', 'active', 'pending')
            GROUP BY
              g.id,
              g.name,
              g.contribution_amount,
              g.currency,
              g.frequency,
              g.member_limit,
              g.status,
              g.organizer_id,
              u.name,
              u.trust_score,
              s.city,
              s.country,
              s.latitude_approx,
              s.longitude_approx,
              s.radius_km,
              s.open_slots,
              s.min_trust_score,
              s.message
            ORDER BY organizer_trust_score DESC, member_count DESC
            LIMIT 100
            """
        )
    ).mappings().all()

    groups = []

    for row in rows:
        distance = km_distance(my_lat, my_lon, row["latitude_approx"], row["longitude_approx"])

        if distance is not None and distance > max_radius:
            continue

        groups.append(
            {
                **dict(row),
                "distance_km": distance,
                "display_location": ", ".join([value for value in [row["city"], row["country"]] if value]),
                "organizer_rating": round(float(row["organizer_rating"] or 0), 1),
                "organizer_review_count": int(row["organizer_review_count"] or 0),
            }
        )

    return groups


@router.post("/discovery/connection-requests")
def send_connection_request(
    payload: ConnectionRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.receiver_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot connect with yourself.")

    receiver = db.get(User, payload.receiver_user_id)

    if not receiver:
        raise HTTPException(status_code=404, detail="User not found.")

    request_id = new_id()

    try:
        db.execute(
            text(
                """
                INSERT INTO connection_requests (
                  id,
                  requester_user_id,
                  receiver_user_id,
                  message,
                  status,
                  created_at,
                  updated_at
                )
                VALUES (
                  :id,
                  :requester_user_id,
                  :receiver_user_id,
                  :message,
                  'pending',
                  NOW(),
                  NOW()
                )
                """
            ),
            {
                "id": request_id,
                "requester_user_id": current_user.id,
                "receiver_user_id": payload.receiver_user_id,
                "message": payload.message,
            },
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Connection request already exists.") from exc

    return {"ok": True, "message": "Connection request sent."}


@router.get("/discovery/requests")
def list_discovery_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incoming = db.execute(
        text(
            """
            SELECT
              r.*,
              u.name AS requester_name,
              u.email AS requester_email,
              u.trust_score AS requester_trust_score
            FROM connection_requests r
            JOIN users u ON u.id = r.requester_user_id
            WHERE r.receiver_user_id = :user_id
            ORDER BY r.created_at DESC
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    outgoing = db.execute(
        text(
            """
            SELECT
              r.*,
              u.name AS receiver_name,
              u.email AS receiver_email,
              u.trust_score AS receiver_trust_score
            FROM connection_requests r
            JOIN users u ON u.id = r.receiver_user_id
            WHERE r.requester_user_id = :user_id
            ORDER BY r.created_at DESC
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    return {
        "incoming": [dict(row) for row in incoming],
        "outgoing": [dict(row) for row in outgoing],
    }


@router.post("/discovery/connection-requests/{request_id}/respond")
def respond_connection_request(
    request_id: str,
    payload: RequestDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.execute(
        text(
            """
            UPDATE connection_requests
            SET status = :status,
                updated_at = NOW()
            WHERE id = :request_id
              AND receiver_user_id = :receiver_user_id
            RETURNING id
            """
        ),
        {
            "request_id": request_id,
            "receiver_user_id": current_user.id,
            "status": payload.decision,
        },
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Connection request not found.")

    db.commit()

    return {"ok": True, "message": "Connection request updated."}


@router.post("/groups/{group_id}/join-requests")
def request_to_join_group(
    group_id: str,
    payload: GroupJoinRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    existing_member = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
            GroupMember.status != "removed_before_start",
        )
    )

    if existing_member:
        raise HTTPException(status_code=400, detail="You are already a member of this group.")

    settings = db.execute(
        text(
            """
            SELECT *
            FROM group_discovery_settings
            WHERE group_id = :group_id
              AND is_discoverable = TRUE
              AND looking_for_members = TRUE
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    if not settings:
        raise HTTPException(status_code=400, detail="This group is not accepting discovery join requests.")

    request_id = new_id()

    try:
        db.execute(
            text(
                """
                INSERT INTO group_join_requests (
                  id,
                  group_id,
                  requester_user_id,
                  message,
                  status,
                  created_at,
                  updated_at
                )
                VALUES (
                  :id,
                  :group_id,
                  :requester_user_id,
                  :message,
                  'pending',
                  NOW(),
                  NOW()
                )
                """
            ),
            {
                "id": request_id,
                "group_id": group_id,
                "requester_user_id": current_user.id,
                "message": payload.message,
            },
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Join request already exists.") from exc

    return {"ok": True, "message": "Join request sent."}


@router.get("/groups/{group_id}/join-requests")
def list_group_join_requests(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_organizer(db, group_id, current_user.id)

    rows = db.execute(
        text(
            """
            SELECT
              r.*,
              u.name AS requester_name,
              u.email AS requester_email,
              u.trust_score AS requester_trust_score,
              u.verification_status AS requester_verification_status
            FROM group_join_requests r
            JOIN users u ON u.id = r.requester_user_id
            WHERE r.group_id = :group_id
            ORDER BY r.created_at DESC
            """
        ),
        {"group_id": group_id},
    ).mappings().all()

    return [dict(row) for row in rows]


@router.post("/groups/{group_id}/join-requests/{request_id}/respond")
def respond_group_join_request(
    group_id: str,
    request_id: str,
    payload: RequestDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    require_group_organizer(db, group_id, current_user.id)

    row = db.execute(
        text(
            """
            SELECT *
            FROM group_join_requests
            WHERE id = :request_id
              AND group_id = :group_id
            """
        ),
        {"request_id": request_id, "group_id": group_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Join request not found")

    db.execute(
        text(
            """
            UPDATE group_join_requests
            SET status = :status,
                updated_at = NOW()
            WHERE id = :request_id
              AND group_id = :group_id
            """
        ),
        {
            "request_id": request_id,
            "group_id": group_id,
            "status": payload.decision,
        },
    )

    if payload.decision == "accepted":
        if group.status in {"active_locked", "cycle_review", "completed", "archived"}:
            db.commit()
            raise HTTPException(status_code=400, detail="This group has already started and is locked.")

        existing_member = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == row["requester_user_id"],
            )
        )

        count = len(
            db.scalars(
                select(GroupMember).where(
                    GroupMember.group_id == group_id,
                    GroupMember.status != "removed_before_start",
                )
            ).all()
        )

        if count >= group.member_limit:
            db.commit()
            raise HTTPException(status_code=400, detail="Group member limit reached.")

        if existing_member:
            existing_member.status = "pending_agreement"
            existing_member.agreement_accepted_at = None
            existing_member.agreement_version = None
        else:
            db.add(
                GroupMember(
                    group_id=group_id,
                    user_id=row["requester_user_id"],
                    role="member",
                    position=count + 1,
                    status="pending_agreement",
                    agreement_accepted_at=None,
                    agreement_version=None,
                    has_received_payout=False,
                )
            )

    db.commit()

    return {"ok": True, "message": "Join request updated."}


@router.post("/users/{reviewed_user_id}/reviews")
def create_member_review(
    reviewed_user_id: str,
    payload: MemberReviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if reviewed_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot review yourself.")

    reviewed = db.get(User, reviewed_user_id)

    if not reviewed:
        raise HTTPException(status_code=404, detail="User not found.")

    if not users_share_group(db, current_user.id, reviewed_user_id, payload.group_id):
        raise HTTPException(status_code=403, detail="You can only review members from a shared group.")

    clean_tags = [tag.strip() for tag in payload.tags if tag.strip()][:8]

    db.execute(
        text(
            """
            INSERT INTO member_reviews (
              id,
              reviewer_user_id,
              reviewed_user_id,
              group_id,
              rating,
              tags,
              note,
              visibility,
              created_at,
              updated_at
            )
            VALUES (
              :id,
              :reviewer_user_id,
              :reviewed_user_id,
              :group_id,
              :rating,
              :tags,
              :note,
              :visibility,
              NOW(),
              NOW()
            )
            ON CONFLICT (reviewer_user_id, reviewed_user_id, group_id)
            DO UPDATE SET
              rating = EXCLUDED.rating,
              tags = EXCLUDED.tags,
              note = EXCLUDED.note,
              visibility = EXCLUDED.visibility,
              updated_at = NOW()
            """
        ),
        {
            "id": new_id(),
            "reviewer_user_id": current_user.id,
            "reviewed_user_id": reviewed_user_id,
            "group_id": payload.group_id,
            "rating": payload.rating,
            "tags": json.dumps(clean_tags),
            "note": payload.note,
            "visibility": payload.visibility,
        },
    )

    db.commit()

    return {"ok": True, "message": "Review saved."}


@router.get("/users/{user_id}/reviews")
def user_reviews(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    rows = db.execute(
        text(
            """
            SELECT
              r.*,
              reviewer.name AS reviewer_name,
              g.name AS group_name
            FROM member_reviews r
            JOIN users reviewer ON reviewer.id = r.reviewer_user_id
            JOIN groups g ON g.id = r.group_id
            WHERE r.reviewed_user_id = :user_id
              AND (
                r.visibility = 'network'
                OR EXISTS (
                  SELECT 1
                  FROM group_members a
                  JOIN group_members b ON a.group_id = b.group_id
                  WHERE a.user_id = :current_user_id
                    AND b.user_id = :user_id
                    AND a.status != 'removed_before_start'
                    AND b.status != 'removed_before_start'
                )
              )
            ORDER BY r.created_at DESC
            LIMIT 50
            """
        ),
        {
            "user_id": user_id,
            "current_user_id": current_user.id,
        },
    ).mappings().all()

    reviews = []

    for row in rows:
        data = dict(row)
        data["tags"] = safe_tags(data.get("tags"))
        reviews.append(data)

    average = round(sum(review["rating"] for review in reviews) / len(reviews), 1) if reviews else 0

    tag_counts: dict[str, int] = {}

    for review in reviews:
        for tag in review["tags"]:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    top_tags = sorted(tag_counts.items(), key=lambda item: item[1], reverse=True)[:8]

    return {
        "user_id": user.id,
        "name": user.name,
        "trust_score": user.trust_score,
        "verification_status": user.verification_status,
        "average_rating": average,
        "review_count": len(reviews),
        "top_tags": [{"tag": tag, "count": count} for tag, count in top_tags],
        "reviews": reviews,
    }