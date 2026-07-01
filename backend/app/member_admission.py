import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import User

router = APIRouter(tags=["member admission"])

JOIN_MODES = {"open", "organizer", "all_members", "majority"}
LEAVE_MODES = {"organizer", "all_members", "majority"}


class AdmissionSettingsUpdate(BaseModel):
    invite_enabled: bool = True
    join_approval_mode: str = "organizer"
    leave_approval_mode: str = "organizer"
    invite_expires_at: str | None = None
    invite_max_uses: int | None = Field(default=None, ge=1, le=10000)
    min_trust_score_to_join: int = Field(default=0, ge=0, le=100)
    public_invite_message: str | None = Field(default=None, max_length=2000)


class JoinRequestCreate(BaseModel):
    message: str | None = Field(default=None, max_length=2000)


class VotePayload(BaseModel):
    decision: str
    note: str | None = Field(default=None, max_length=2000)


class AddMemberPayload(BaseModel):
    email: EmailStr
    message: str | None = Field(default=None, max_length=2000)


class LeaveRequestCreate(BaseModel):
    message: str | None = Field(default=None, max_length=2000)


def new_id() -> str:
    return str(uuid.uuid4())


def table_exists(db: Session, table_name: str) -> bool:
    row = db.execute(
        text(
            """
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_name = :table_name
            ) AS exists
            """
        ),
        {"table_name": table_name},
    ).mappings().first()

    return bool(row and row["exists"])


def table_columns(db: Session, table_name: str) -> set[str]:
    rows = db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = :table_name
            """
        ),
        {"table_name": table_name},
    ).mappings().all()

    return {row["column_name"] for row in rows}


def active_status_filter(alias: str = "gm") -> str:
    return f"COALESCE({alias}.status, 'active') NOT IN ('removed_before_start', 'left', 'removed')"


def group_or_404(db: Session, group_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT *
            FROM groups
            WHERE id = :group_id
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Group not found")

    return dict(row)


def group_by_invite_or_404(db: Session, invite_code: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT *
            FROM groups
            WHERE UPPER(invite_code) = UPPER(:invite_code)
            LIMIT 1
            """
        ),
        {"invite_code": invite_code},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Invite not found")

    return dict(row)


def require_group_member(db: Session, group_id: str, user_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            f"""
            SELECT *
            FROM group_members gm
            WHERE gm.group_id = :group_id
              AND gm.user_id = :user_id
              AND {active_status_filter("gm")}
            """
        ),
        {"group_id": group_id, "user_id": user_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    return dict(row)


def is_group_member(db: Session, group_id: str, user_id: str) -> bool:
    row = db.execute(
        text(
            f"""
            SELECT id
            FROM group_members gm
            WHERE gm.group_id = :group_id
              AND gm.user_id = :user_id
              AND {active_status_filter("gm")}
            LIMIT 1
            """
        ),
        {"group_id": group_id, "user_id": user_id},
    ).mappings().first()

    return bool(row)


def require_group_organizer(db: Session, group_id: str, user_id: str) -> dict[str, Any]:
    member = require_group_member(db, group_id, user_id)

    if member.get("role") not in {"organizer", "co_organizer"}:
        raise HTTPException(status_code=403, detail="Only an organizer can manage admissions")

    return member


def active_members(db: Session, group_id: str) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            f"""
            SELECT
              gm.id AS member_id,
              gm.user_id,
              gm.role,
              u.name,
              u.email,
              COALESCE(u.trust_score, 0) AS trust_score
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = :group_id
              AND {active_status_filter("gm")}
            ORDER BY
              CASE gm.role
                WHEN 'organizer' THEN 1
                WHEN 'co_organizer' THEN 2
                ELSE 3
              END,
              u.name ASC
            """
        ),
        {"group_id": group_id},
    ).mappings().all()

    return [dict(row) for row in rows]


def organizer_count(db: Session, group_id: str, exclude_user_id: str | None = None) -> int:
    params: dict[str, Any] = {"group_id": group_id}
    exclude_clause = ""

    if exclude_user_id:
        exclude_clause = "AND gm.user_id != :exclude_user_id"
        params["exclude_user_id"] = exclude_user_id

    row = db.execute(
        text(
            f"""
            SELECT COUNT(*) AS count
            FROM group_members gm
            WHERE gm.group_id = :group_id
              AND gm.role IN ('organizer', 'co_organizer')
              AND {active_status_filter("gm")}
              {exclude_clause}
            """
        ),
        params,
    ).mappings().first()

    return int(row["count"] or 0)


def required_voters(db: Session, group_id: str, mode: str, exclude_user_id: str | None = None) -> list[dict[str, Any]]:
    members = active_members(db, group_id)

    if exclude_user_id:
        members = [member for member in members if member["user_id"] != exclude_user_id]

    if mode == "organizer":
        return [member for member in members if member["role"] in {"organizer", "co_organizer"}]

    if mode in {"all_members", "majority"}:
        return members

    return []


def threshold_for(mode: str, voter_count: int) -> int:
    if voter_count <= 0:
        return 0

    if mode == "majority":
        return voter_count // 2 + 1

    return voter_count


def create_notification(
    db: Session,
    user_id: str,
    title: str,
    body: str,
    notification_type: str,
    group_id: str | None,
    related_url: str | None,
    dedupe_key: str,
):
    if not table_exists(db, "notifications"):
        return

    columns = table_columns(db, "notifications")
    values: dict[str, Any] = {}

    def add(column: str, value: Any):
        if column in columns:
            values[column] = value

    add("id", new_id())
    add("user_id", user_id)
    add("type", notification_type)
    add("title", title)
    add("body", body)
    add("related_group_id", group_id)
    add("related_url", related_url)
    add("dedupe_key", dedupe_key)
    add("created_at", datetime.now(timezone.utc))
    add("updated_at", datetime.now(timezone.utc))

    if "read_at" in columns:
        values["read_at"] = None

    if not values:
        return

    db.execute(
        text(
            f"""
            INSERT INTO notifications ({", ".join(values.keys())})
            VALUES ({", ".join(f":{key}" for key in values.keys())})
            ON CONFLICT (user_id, dedupe_key)
            DO UPDATE SET
              title = EXCLUDED.title,
              body = EXCLUDED.body,
              updated_at = NOW(),
              read_at = NULL
            """
        ),
        values,
    )


def audit_log(
    db: Session,
    group_id: str,
    actor_user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    metadata: dict[str, Any] | None = None,
):
    if not table_exists(db, "audit_logs"):
        return

    columns = table_columns(db, "audit_logs")
    values: dict[str, Any] = {}

    def add(column: str, value: Any):
        if column in columns:
            values[column] = value

    add("id", new_id())
    add("group_id", group_id)
    add("actor_user_id", actor_user_id)
    add("user_id", actor_user_id)
    add("action", action)
    add("entity_type", entity_type)
    add("entity_id", entity_id)
    add("created_at", datetime.now(timezone.utc))

    if "metadata" in columns:
        add("metadata", json.dumps(metadata or {}, default=str))

    if "details" in columns:
        add("details", json.dumps(metadata or {}, default=str))

    if not values:
        return

    db.execute(
        text(
            f"""
            INSERT INTO audit_logs ({", ".join(values.keys())})
            VALUES ({", ".join(f":{key}" for key in values.keys())})
            """
        ),
        values,
    )


def validate_invite(group: dict[str, Any], current_user: User):
    if group.get("status") in {"archived", "closed", "active_locked"}:
        raise HTTPException(status_code=403, detail="This group is not accepting direct joins")

    if not group.get("invite_enabled", True):
        raise HTTPException(status_code=403, detail="This invite link is disabled")

    expires_at = group.get("invite_expires_at")
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=403, detail="This invite link has expired")

    max_uses = group.get("invite_max_uses")
    if max_uses is not None and int(group.get("invite_uses") or 0) >= int(max_uses):
        raise HTTPException(status_code=403, detail="This invite link has reached its use limit")

    min_score = int(group.get("min_trust_score_to_join") or 0)
    if int(getattr(current_user, "trust_score", 0) or 0) < min_score:
        raise HTTPException(status_code=403, detail="Your trust score does not meet this group's invite requirement")


def group_is_full(db: Session, group: dict[str, Any]) -> bool:
    row = db.execute(
        text(
            f"""
            SELECT COUNT(*) AS count
            FROM group_members gm
            WHERE gm.group_id = :group_id
              AND {active_status_filter("gm")}
            """
        ),
        {"group_id": group["id"]},
    ).mappings().first()

    return int(row["count"] or 0) >= int(group.get("member_limit") or 0)


def add_member_to_group(
    db: Session,
    group: dict[str, Any],
    user_id: str,
    actor_user_id: str,
    reason: str,
) -> dict[str, Any]:
    existing = db.execute(
        text(
            """
            SELECT *
            FROM group_members
            WHERE group_id = :group_id
              AND user_id = :user_id
            LIMIT 1
            """
        ),
        {"group_id": group["id"], "user_id": user_id},
    ).mappings().first()

    member_status = "pending_agreement" if group.get("agreement_required", True) else "active"

    if existing and existing.get("status") not in {"removed_before_start", "left", "removed"}:
        return {"status": "already_member", "member": dict(existing)}

    columns = table_columns(db, "group_members")

    if existing:
        updates: dict[str, Any] = {
            "group_id": group["id"],
            "user_id": user_id,
        }

        set_parts = []

        if "status" in columns:
            set_parts.append("status = :status")
            updates["status"] = member_status

        if "role" in columns:
            set_parts.append("role = 'member'")

        if "agreement_version" in columns:
            set_parts.append("agreement_version = :agreement_version")
            updates["agreement_version"] = group.get("agreement_version", 1)

        if "has_received_payout" in columns:
            set_parts.append("has_received_payout = FALSE")

        if "left_at" in columns:
            set_parts.append("left_at = NULL")

        if "removed_reason" in columns:
            set_parts.append("removed_reason = NULL")

        if "updated_at" in columns:
            set_parts.append("updated_at = NOW()")

        if not set_parts:
            return {"status": "already_member", "member": dict(existing)}

        row = db.execute(
            text(
                f"""
                UPDATE group_members
                SET {", ".join(set_parts)}
                WHERE group_id = :group_id
                  AND user_id = :user_id
                RETURNING *
                """
            ),
            updates,
        ).mappings().first()
    else:
        values: dict[str, Any] = {}

        def add(column: str, value: Any):
            if column in columns:
                values[column] = value

        add("id", new_id())
        add("group_id", group["id"])
        add("user_id", user_id)
        add("role", "member")
        add("status", member_status)
        add("agreement_version", group.get("agreement_version", 1))
        add("has_received_payout", False)
        add("joined_at", datetime.now(timezone.utc))
        add("created_at", datetime.now(timezone.utc))
        add("updated_at", datetime.now(timezone.utc))

        row = db.execute(
            text(
                f"""
                INSERT INTO group_members ({", ".join(values.keys())})
                VALUES ({", ".join(f":{key}" for key in values.keys())})
                RETURNING *
                """
            ),
            values,
        ).mappings().first()

    db.execute(
        text(
            """
            UPDATE groups
            SET invite_uses = COALESCE(invite_uses, 0) + 1
            WHERE id = :group_id
            """
        ),
        {"group_id": group["id"]},
    )

    audit_log(
        db,
        group["id"],
        actor_user_id,
        "member_admitted",
        "user",
        user_id,
        {"reason": reason},
    )

    return {"status": "joined", "member": dict(row)}


def request_vote_counts(db: Session, table_name: str, request_id: str) -> dict[str, int]:
    rows = db.execute(
        text(
            f"""
            SELECT decision, COUNT(*) AS count
            FROM {table_name}
            WHERE request_id = :request_id
            GROUP BY decision
            """
        ),
        {"request_id": request_id},
    ).mappings().all()

    counts = {"approve": 0, "decline": 0}

    for row in rows:
        if row["decision"] in counts:
            counts[row["decision"]] = int(row["count"] or 0)

    return counts


def get_join_request(db: Session, request_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT
              gjr.*,
              requester.name AS requester_name,
              requester.email AS requester_email,
              COALESCE(requester.trust_score, 0) AS requester_trust_score_live,
              inviter.name AS invited_by_name
            FROM group_join_requests gjr
            JOIN users requester ON requester.id = gjr.requester_user_id
            LEFT JOIN users inviter ON inviter.id = gjr.invited_by_user_id
            WHERE gjr.id = :request_id
            """
        ),
        {"request_id": request_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Join request not found")

    return dict(row)


def get_leave_request(db: Session, request_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT
              glr.*,
              requester.name AS requester_name,
              requester.email AS requester_email
            FROM group_leave_requests glr
            JOIN users requester ON requester.id = glr.requester_user_id
            WHERE glr.id = :request_id
            """
        ),
        {"request_id": request_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Leave request not found")

    return dict(row)


def finalise_join_request_if_ready(db: Session, request_id: str, actor_user_id: str):
    request = get_join_request(db, request_id)

    if request["status"] != "pending":
        return request

    group = group_or_404(db, request["group_id"])
    mode = request.get("approval_mode") or group.get("join_approval_mode") or "organizer"
    voters = required_voters(db, request["group_id"], mode)
    voter_ids = {voter["user_id"] for voter in voters}
    counts = request_vote_counts(db, "group_join_request_votes", request_id)
    threshold = threshold_for(mode, len(voters))

    approved = False
    declined = False

    if mode == "organizer":
        approved = counts["approve"] >= 1
        declined = counts["decline"] >= 1 and not approved
    elif mode == "all_members":
        approved = threshold == 0 or counts["approve"] >= threshold
        declined = counts["decline"] >= 1
    elif mode == "majority":
        approved = threshold == 0 or counts["approve"] >= threshold
        declined = counts["decline"] >= threshold

    if not approved and not declined:
        return request

    if declined:
        row = db.execute(
            text(
                """
                UPDATE group_join_requests
                SET status = 'declined',
                    decided_by_user_id = :decided_by_user_id,
                    decided_at = NOW(),
                    updated_at = NOW()
                WHERE id = :request_id
                RETURNING *
                """
            ),
            {"request_id": request_id, "decided_by_user_id": actor_user_id},
        ).mappings().first()

        create_notification(
            db,
            request["requester_user_id"],
            "Join request declined",
            f"Your request to join {group['name']} was declined.",
            "join_request_declined",
            group["id"],
            f"/g/{group['invite_code']}",
            f"join-request-declined:{request_id}",
        )

        audit_log(db, group["id"], actor_user_id, "join_request_declined", "join_request", request_id, {})
        return dict(row)

    if group_is_full(db, group):
        raise HTTPException(status_code=403, detail="This group is already full")

    add_member_to_group(db, group, request["requester_user_id"], actor_user_id, "join_request_approved")

    row = db.execute(
        text(
            """
            UPDATE group_join_requests
            SET status = 'approved',
                decided_by_user_id = :decided_by_user_id,
                decided_at = NOW(),
                updated_at = NOW()
            WHERE id = :request_id
            RETURNING *
            """
        ),
        {"request_id": request_id, "decided_by_user_id": actor_user_id},
    ).mappings().first()

    create_notification(
        db,
        request["requester_user_id"],
        "Join request approved",
        f"Your request to join {group['name']} was approved.",
        "join_request_approved",
        group["id"],
        f"/groups/{group['id']}",
        f"join-request-approved:{request_id}",
    )

    for voter_id in voter_ids:
        create_notification(
            db,
            voter_id,
            "New member admitted",
            f"{request['requester_name']} was admitted to {group['name']}.",
            "member_admitted",
            group["id"],
            f"/groups/{group['id']}",
            f"member-admitted:{request_id}:{voter_id}",
        )

    audit_log(db, group["id"], actor_user_id, "join_request_approved", "join_request", request_id, {})
    return dict(row)


def group_commitment_allows_exit(db: Session, group_id: str) -> bool:
    group = group_or_404(db, group_id)

    if not group.get("locked_at"):
        return True

    columns = table_columns(db, "group_members")

    if "has_received_payout" not in columns:
        return False

    row = db.execute(
        text(
            f"""
            SELECT COUNT(*) AS count
            FROM group_members gm
            WHERE gm.group_id = :group_id
              AND {active_status_filter("gm")}
              AND COALESCE(gm.has_received_payout, FALSE) = FALSE
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    return int(row["count"] or 0) == 0


def remove_member_from_group(
    db: Session,
    group_id: str,
    user_id: str,
    actor_user_id: str,
    reason: str,
):
    columns = table_columns(db, "group_members")
    set_parts = []
    values = {
        "group_id": group_id,
        "user_id": user_id,
    }

    if "status" in columns:
        set_parts.append("status = 'removed_before_start'")

    if "left_at" in columns:
        set_parts.append("left_at = NOW()")

    if "removed_reason" in columns:
        set_parts.append("removed_reason = :removed_reason")
        values["removed_reason"] = reason

    if "updated_at" in columns:
        set_parts.append("updated_at = NOW()")

    if not set_parts:
        db.execute(
            text(
                """
                DELETE FROM group_members
                WHERE group_id = :group_id
                  AND user_id = :user_id
                """
            ),
            values,
        )
    else:
        db.execute(
            text(
                f"""
                UPDATE group_members
                SET {", ".join(set_parts)}
                WHERE group_id = :group_id
                  AND user_id = :user_id
                """
            ),
            values,
        )

    audit_log(db, group_id, actor_user_id, "member_left_group", "user", user_id, {"reason": reason})


def finalise_leave_request_if_ready(db: Session, request_id: str, actor_user_id: str):
    request = get_leave_request(db, request_id)

    if request["status"] != "pending":
        return request

    group = group_or_404(db, request["group_id"])
    mode = request.get("approval_mode") or group.get("leave_approval_mode") or "organizer"
    voters = required_voters(db, request["group_id"], mode, exclude_user_id=request["requester_user_id"])
    counts = request_vote_counts(db, "group_leave_request_votes", request_id)
    threshold = threshold_for(mode, len(voters))

    approved = False
    declined = False

    if mode == "organizer":
        approved = counts["approve"] >= 1
        declined = counts["decline"] >= 1 and not approved
    elif mode == "all_members":
        approved = threshold == 0 or counts["approve"] >= threshold
        declined = counts["decline"] >= 1
    elif mode == "majority":
        approved = threshold == 0 or counts["approve"] >= threshold
        declined = counts["decline"] >= threshold

    if not approved and not declined:
        return request

    if declined:
        row = db.execute(
            text(
                """
                UPDATE group_leave_requests
                SET status = 'declined',
                    decided_by_user_id = :decided_by_user_id,
                    decided_at = NOW(),
                    updated_at = NOW()
                WHERE id = :request_id
                RETURNING *
                """
            ),
            {"request_id": request_id, "decided_by_user_id": actor_user_id},
        ).mappings().first()

        create_notification(
            db,
            request["requester_user_id"],
            "Leave request declined",
            f"Your request to leave {group['name']} was declined.",
            "leave_request_declined",
            group["id"],
            f"/groups/{group['id']}",
            f"leave-request-declined:{request_id}",
        )

        return dict(row)

    if group_commitment_allows_exit(db, request["group_id"]):
        remove_member_from_group(
            db,
            request["group_id"],
            request["requester_user_id"],
            actor_user_id,
            "leave_request_approved",
        )
        status = "approved"
        notification_body = f"Your request to leave {group['name']} was approved."
    else:
        status = "approved_waiting_completion"
        notification_body = (
            f"Your request to leave {group['name']} was approved, "
            "but exit is waiting until the Circle Commitment is complete."
        )

    row = db.execute(
        text(
            """
            UPDATE group_leave_requests
            SET status = :status,
                decided_by_user_id = :decided_by_user_id,
                decided_at = NOW(),
                updated_at = NOW()
            WHERE id = :request_id
            RETURNING *
            """
        ),
        {
            "request_id": request_id,
            "status": status,
            "decided_by_user_id": actor_user_id,
        },
    ).mappings().first()

    create_notification(
        db,
        request["requester_user_id"],
        "Leave request updated",
        notification_body,
        "leave_request_updated",
        group["id"],
        f"/groups/{group['id']}",
        f"leave-request-updated:{request_id}",
    )

    return dict(row)


def create_join_request(
    db: Session,
    group: dict[str, Any],
    requester_user: User,
    message: str | None,
    invited_by_user_id: str | None = None,
) -> dict[str, Any]:
    request_id = new_id()
    approval_mode = group.get("join_approval_mode") or "organizer"

    row = db.execute(
        text(
            """
            INSERT INTO group_join_requests (
              id,
              group_id,
              requester_user_id,
              invited_by_user_id,
              message,
              status,
              approval_mode,
              requester_trust_score,
              created_at,
              updated_at
            )
            VALUES (
              :id,
              :group_id,
              :requester_user_id,
              :invited_by_user_id,
              :message,
              'pending',
              :approval_mode,
              :requester_trust_score,
              NOW(),
              NOW()
            )
            ON CONFLICT (group_id, requester_user_id)
            DO UPDATE SET
              invited_by_user_id = EXCLUDED.invited_by_user_id,
              message = EXCLUDED.message,
              status = 'pending',
              approval_mode = EXCLUDED.approval_mode,
              requester_trust_score = EXCLUDED.requester_trust_score,
              updated_at = NOW()
            RETURNING *
            """
        ),
        {
            "id": request_id,
            "group_id": group["id"],
            "requester_user_id": requester_user.id,
            "invited_by_user_id": invited_by_user_id,
            "message": message,
            "approval_mode": approval_mode,
            "requester_trust_score": int(getattr(requester_user, "trust_score", 0) or 0),
        },
    ).mappings().first()

    request = dict(row)
    request_id = request["id"]

    voters = required_voters(db, group["id"], approval_mode)

    for voter in voters:
        if voter["user_id"] == requester_user.id:
            continue

        create_notification(
            db,
            voter["user_id"],
            "New member request",
            f"{requester_user.name} requested to join {group['name']}.",
            "join_request_pending",
            group["id"],
            f"/groups/{group['id']}",
            f"join-request-pending:{request_id}:{voter['user_id']}",
        )

    audit_log(
        db,
        group["id"],
        requester_user.id,
        "join_request_created",
        "join_request",
        request_id,
        {"approval_mode": approval_mode},
    )

    return request


def join_invite_for_user(
    invite_code: str,
    db: Session,
    current_user: User,
    message: str | None = None,
) -> dict[str, Any]:
    group = group_by_invite_or_404(db, invite_code)
    validate_invite(group, current_user)

    if is_group_member(db, group["id"], current_user.id):
        return {
            "status": "already_member",
            "group": group,
        }

    if group_is_full(db, group):
        raise HTTPException(status_code=403, detail="This group is already full")

    approval_mode = group.get("join_approval_mode") or "organizer"

    if approval_mode == "open":
        result = add_member_to_group(db, group, current_user.id, current_user.id, "open_invite")
        db.commit()
        return {
            "status": result["status"],
            "group": group_or_404(db, group["id"]),
        }

    request = create_join_request(db, group, current_user, message)

    db.commit()

    return {
        "status": "approval_required",
        "approval_mode": approval_mode,
        "request": request,
        "group": group,
    }


@router.get("/groups/{group_id}/admission/settings")
def get_admission_settings(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)
    group = group_or_404(db, group_id)

    return {
        "group_id": group_id,
        "invite_code": group["invite_code"],
        "invite_enabled": group.get("invite_enabled", True),
        "join_approval_mode": group.get("join_approval_mode") or "organizer",
        "leave_approval_mode": group.get("leave_approval_mode") or "organizer",
        "invite_expires_at": group.get("invite_expires_at"),
        "invite_max_uses": group.get("invite_max_uses"),
        "invite_uses": group.get("invite_uses", 0),
        "min_trust_score_to_join": group.get("min_trust_score_to_join", 0),
        "public_invite_message": group.get("public_invite_message"),
    }


@router.put("/groups/{group_id}/admission/settings")
def update_admission_settings(
    group_id: str,
    payload: AdmissionSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_organizer(db, group_id, current_user.id)

    join_mode = payload.join_approval_mode.strip().lower()
    leave_mode = payload.leave_approval_mode.strip().lower()

    if join_mode not in JOIN_MODES:
        raise HTTPException(status_code=400, detail="Invalid join approval mode")

    if leave_mode not in LEAVE_MODES:
        raise HTTPException(status_code=400, detail="Invalid leave approval mode")

    invite_expires_at = None
    if payload.invite_expires_at:
        invite_expires_at = datetime.fromisoformat(payload.invite_expires_at.replace("Z", "+00:00"))

    row = db.execute(
        text(
            """
            UPDATE groups
            SET invite_enabled = :invite_enabled,
                join_approval_mode = :join_approval_mode,
                leave_approval_mode = :leave_approval_mode,
                invite_approval_required = :invite_approval_required,
                invite_expires_at = :invite_expires_at,
                invite_max_uses = :invite_max_uses,
                min_trust_score_to_join = :min_trust_score_to_join,
                public_invite_message = :public_invite_message
            WHERE id = :group_id
            RETURNING *
            """
        ),
        {
            "group_id": group_id,
            "invite_enabled": payload.invite_enabled,
            "join_approval_mode": join_mode,
            "leave_approval_mode": leave_mode,
            "invite_approval_required": join_mode != "open",
            "invite_expires_at": invite_expires_at,
            "invite_max_uses": payload.invite_max_uses,
            "min_trust_score_to_join": payload.min_trust_score_to_join,
            "public_invite_message": payload.public_invite_message,
        },
    ).mappings().first()

    audit_log(
        db,
        group_id,
        current_user.id,
        "admission_settings_updated",
        "group",
        group_id,
        payload.model_dump(),
    )

    db.commit()

    return {
        "group_id": group_id,
        "invite_code": row["invite_code"],
        "invite_enabled": row["invite_enabled"],
        "join_approval_mode": row["join_approval_mode"],
        "leave_approval_mode": row["leave_approval_mode"],
        "invite_expires_at": row["invite_expires_at"],
        "invite_max_uses": row["invite_max_uses"],
        "invite_uses": row["invite_uses"],
        "min_trust_score_to_join": row["min_trust_score_to_join"],
        "public_invite_message": row["public_invite_message"],
    }


@router.post("/member-admission/invites/{invite_code}/join")
def request_or_join_by_invite(
    invite_code: str,
    payload: JoinRequestCreate | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return join_invite_for_user(invite_code, db, current_user, payload.message if payload else None)


@router.post("/groups/{group_id}/admission/add-member")
def add_existing_user_to_group(
    group_id: str,
    payload: AddMemberPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_organizer(db, group_id, current_user.id)
    group = group_or_404(db, group_id)

    user = db.execute(
        text(
            """
            SELECT *
            FROM users
            WHERE LOWER(email) = LOWER(:email)
            LIMIT 1
            """
        ),
        {"email": payload.email},
    ).mappings().first()

    if not user:
        raise HTTPException(status_code=404, detail="No Rota user exists with this email")

    target_user = type("UserLike", (), dict(user))()
    target_user.id = user["id"]
    target_user.name = user["name"]
    target_user.trust_score = user.get("trust_score", 0)

    if is_group_member(db, group_id, user["id"]):
        raise HTTPException(status_code=400, detail="This user is already a member")

    if group_is_full(db, group):
        raise HTTPException(status_code=403, detail="This group is already full")

    mode = group.get("join_approval_mode") or "organizer"

    if mode in {"open", "organizer"}:
        result = add_member_to_group(db, group, user["id"], current_user.id, "organizer_added_member")

        create_notification(
            db,
            user["id"],
            "Added to group",
            f"You were added to {group['name']}.",
            "member_added",
            group_id,
            f"/groups/{group_id}",
            f"member-added:{group_id}:{user['id']}",
        )

        db.commit()
        return {"status": result["status"], "group": group_or_404(db, group_id)}

    request = create_join_request(
        db,
        group,
        target_user,
        payload.message or f"{current_user.name} proposed adding this member.",
        invited_by_user_id=current_user.id,
    )

    db.execute(
        text(
            """
            INSERT INTO group_join_request_votes (
              request_id,
              voter_user_id,
              decision,
              note,
              created_at,
              updated_at
            )
            VALUES (
              :request_id,
              :voter_user_id,
              'approve',
              :note,
              NOW(),
              NOW()
            )
            ON CONFLICT (request_id, voter_user_id)
            DO UPDATE SET
              decision = 'approve',
              note = EXCLUDED.note,
              updated_at = NOW()
            """
        ),
        {
            "request_id": request["id"],
            "voter_user_id": current_user.id,
            "note": "Organizer proposed this member.",
        },
    )

    finalise_join_request_if_ready(db, request["id"], current_user.id)

    db.commit()

    return {
        "status": "approval_required",
        "request": get_join_request(db, request["id"]),
        "group": group,
    }


@router.post("/admission/join-requests/{request_id}/vote")
def vote_on_join_request(
    request_id: str,
    payload: VotePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request = get_join_request(db, request_id)
    group = group_or_404(db, request["group_id"])
    mode = request.get("approval_mode") or group.get("join_approval_mode") or "organizer"

    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="This join request is no longer pending")

    decision = payload.decision.strip().lower()

    if decision not in {"approve", "decline"}:
        raise HTTPException(status_code=400, detail="Decision must be approve or decline")

    voters = required_voters(db, request["group_id"], mode)
    voter_ids = {voter["user_id"] for voter in voters}

    if current_user.id not in voter_ids:
        raise HTTPException(status_code=403, detail="You cannot vote on this join request")

    db.execute(
        text(
            """
            INSERT INTO group_join_request_votes (
              request_id,
              voter_user_id,
              decision,
              note,
              created_at,
              updated_at
            )
            VALUES (
              :request_id,
              :voter_user_id,
              :decision,
              :note,
              NOW(),
              NOW()
            )
            ON CONFLICT (request_id, voter_user_id)
            DO UPDATE SET
              decision = EXCLUDED.decision,
              note = EXCLUDED.note,
              updated_at = NOW()
            """
        ),
        {
            "request_id": request_id,
            "voter_user_id": current_user.id,
            "decision": decision,
            "note": payload.note,
        },
    )

    finalise_join_request_if_ready(db, request_id, current_user.id)

    db.commit()

    return get_join_request(db, request_id)


@router.post("/groups/{group_id}/admission/leave")
def request_leave_group(
    group_id: str,
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = require_group_member(db, group_id, current_user.id)
    group = group_or_404(db, group_id)

    if member.get("role") in {"organizer", "co_organizer"} and organizer_count(db, group_id, exclude_user_id=current_user.id) <= 0:
        active_count = len(active_members(db, group_id))
        if active_count > 1:
            raise HTTPException(status_code=400, detail="Assign another organizer before leaving this group")

    if group_commitment_allows_exit(db, group_id):
        remove_member_from_group(db, group_id, current_user.id, current_user.id, "member_left_directly")
        db.commit()
        return {"status": "left"}

    mode = group.get("leave_approval_mode") or "organizer"

    request = db.execute(
        text(
            """
            INSERT INTO group_leave_requests (
              id,
              group_id,
              requester_user_id,
              message,
              status,
              approval_mode,
              created_at,
              updated_at
            )
            VALUES (
              :id,
              :group_id,
              :requester_user_id,
              :message,
              'pending',
              :approval_mode,
              NOW(),
              NOW()
            )
            ON CONFLICT (group_id, requester_user_id)
            WHERE status IN ('pending', 'approved_waiting_completion')
            DO UPDATE SET
              message = EXCLUDED.message,
              status = 'pending',
              approval_mode = EXCLUDED.approval_mode,
              updated_at = NOW()
            RETURNING *
            """
        ),
        {
            "id": new_id(),
            "group_id": group_id,
            "requester_user_id": current_user.id,
            "message": payload.message,
            "approval_mode": mode,
        },
    ).mappings().first()

    voters = required_voters(db, group_id, mode, exclude_user_id=current_user.id)

    for voter in voters:
        create_notification(
            db,
            voter["user_id"],
            "Leave request pending",
            f"{current_user.name} requested to leave {group['name']}.",
            "leave_request_pending",
            group_id,
            f"/groups/{group_id}",
            f"leave-request-pending:{request['id']}:{voter['user_id']}",
        )

    audit_log(db, group_id, current_user.id, "leave_request_created", "leave_request", request["id"], {})

    db.commit()

    return {"status": "approval_required", "request": dict(request)}


@router.post("/admission/leave-requests/{request_id}/vote")
def vote_on_leave_request(
    request_id: str,
    payload: VotePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request = get_leave_request(db, request_id)
    group = group_or_404(db, request["group_id"])
    mode = request.get("approval_mode") or group.get("leave_approval_mode") or "organizer"

    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="This leave request is no longer pending")

    decision = payload.decision.strip().lower()

    if decision not in {"approve", "decline"}:
        raise HTTPException(status_code=400, detail="Decision must be approve or decline")

    voters = required_voters(db, request["group_id"], mode, exclude_user_id=request["requester_user_id"])
    voter_ids = {voter["user_id"] for voter in voters}

    if current_user.id not in voter_ids:
        raise HTTPException(status_code=403, detail="You cannot vote on this leave request")

    db.execute(
        text(
            """
            INSERT INTO group_leave_request_votes (
              request_id,
              voter_user_id,
              decision,
              note,
              created_at,
              updated_at
            )
            VALUES (
              :request_id,
              :voter_user_id,
              :decision,
              :note,
              NOW(),
              NOW()
            )
            ON CONFLICT (request_id, voter_user_id)
            DO UPDATE SET
              decision = EXCLUDED.decision,
              note = EXCLUDED.note,
              updated_at = NOW()
            """
        ),
        {
            "request_id": request_id,
            "voter_user_id": current_user.id,
            "decision": decision,
            "note": payload.note,
        },
    )

    finalise_leave_request_if_ready(db, request_id, current_user.id)

    db.commit()

    return get_leave_request(db, request_id)


@router.get("/groups/{group_id}/admission/overview")
def admission_overview(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = require_group_member(db, group_id, current_user.id)
    group = group_or_404(db, group_id)

    join_requests = db.execute(
        text(
            """
            SELECT
              gjr.*,
              requester.name AS requester_name,
              requester.email AS requester_email,
              COALESCE(requester.trust_score, 0) AS requester_trust_score_live,
              inviter.name AS invited_by_name,
              (
                SELECT COUNT(*)
                FROM group_join_request_votes gjrv
                WHERE gjrv.request_id = gjr.id
                  AND gjrv.decision = 'approve'
              ) AS approve_count,
              (
                SELECT COUNT(*)
                FROM group_join_request_votes gjrv
                WHERE gjrv.request_id = gjr.id
                  AND gjrv.decision = 'decline'
              ) AS decline_count,
              (
                SELECT gjrv.decision
                FROM group_join_request_votes gjrv
                WHERE gjrv.request_id = gjr.id
                  AND gjrv.voter_user_id = :current_user_id
                LIMIT 1
              ) AS my_vote
            FROM group_join_requests gjr
            JOIN users requester ON requester.id = gjr.requester_user_id
            LEFT JOIN users inviter ON inviter.id = gjr.invited_by_user_id
            WHERE gjr.group_id = :group_id
            ORDER BY
              CASE gjr.status
                WHEN 'pending' THEN 1
                WHEN 'approved' THEN 2
                WHEN 'declined' THEN 3
                ELSE 4
              END,
              gjr.created_at DESC
            """
        ),
        {"group_id": group_id, "current_user_id": current_user.id},
    ).mappings().all()

    leave_requests = db.execute(
        text(
            """
            SELECT
              glr.*,
              requester.name AS requester_name,
              requester.email AS requester_email,
              (
                SELECT COUNT(*)
                FROM group_leave_request_votes glrv
                WHERE glrv.request_id = glr.id
                  AND glrv.decision = 'approve'
              ) AS approve_count,
              (
                SELECT COUNT(*)
                FROM group_leave_request_votes glrv
                WHERE glrv.request_id = glr.id
                  AND glrv.decision = 'decline'
              ) AS decline_count,
              (
                SELECT glrv.decision
                FROM group_leave_request_votes glrv
                WHERE glrv.request_id = glr.id
                  AND glrv.voter_user_id = :current_user_id
                LIMIT 1
              ) AS my_vote
            FROM group_leave_requests glr
            JOIN users requester ON requester.id = glr.requester_user_id
            WHERE glr.group_id = :group_id
            ORDER BY
              CASE glr.status
                WHEN 'pending' THEN 1
                WHEN 'approved_waiting_completion' THEN 2
                WHEN 'approved' THEN 3
                WHEN 'declined' THEN 4
                ELSE 5
              END,
              glr.created_at DESC
            """
        ),
        {"group_id": group_id, "current_user_id": current_user.id},
    ).mappings().all()

    settings = {
        "group_id": group_id,
        "invite_code": group["invite_code"],
        "invite_enabled": group.get("invite_enabled", True),
        "join_approval_mode": group.get("join_approval_mode") or "organizer",
        "leave_approval_mode": group.get("leave_approval_mode") or "organizer",
        "invite_expires_at": group.get("invite_expires_at"),
        "invite_max_uses": group.get("invite_max_uses"),
        "invite_uses": group.get("invite_uses", 0),
        "min_trust_score_to_join": group.get("min_trust_score_to_join", 0),
        "public_invite_message": group.get("public_invite_message"),
    }

    return {
        "settings": settings,
        "is_organizer": member.get("role") in {"organizer", "co_organizer"},
        "can_leave_now": group_commitment_allows_exit(db, group_id),
        "join_requests": [dict(row) for row in join_requests],
        "leave_requests": [dict(row) for row in leave_requests],
    }


@router.get("/member-admission/action-items")
def member_admission_action_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items: list[dict[str, Any]] = []

    join_rows = db.execute(
        text(
            f"""
            SELECT
              gjr.id,
              gjr.group_id,
              gjr.approval_mode,
              g.name AS group_name,
              requester.name AS requester_name
            FROM group_join_requests gjr
            JOIN groups g ON g.id = gjr.group_id
            JOIN users requester ON requester.id = gjr.requester_user_id
            JOIN group_members gm ON gm.group_id = gjr.group_id
            WHERE gjr.status = 'pending'
              AND gm.user_id = :user_id
              AND {active_status_filter("gm")}
              AND NOT EXISTS (
                SELECT 1
                FROM group_join_request_votes vote
                WHERE vote.request_id = gjr.id
                  AND vote.voter_user_id = :user_id
              )
              AND (
                gjr.approval_mode IN ('all_members', 'majority')
                OR (
                  gjr.approval_mode = 'organizer'
                  AND gm.role IN ('organizer', 'co_organizer')
                )
              )
            ORDER BY gjr.created_at DESC
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    for row in join_rows:
        items.append(
            {
                "id": f"join:{row['id']}",
                "type": "join_request",
                "priority": "high",
                "title": "Member join request",
                "body": f"{row['requester_name']} wants to join {row['group_name']}.",
                "related_group_id": row["group_id"],
                "related_url": f"/groups/{row['group_id']}",
            }
        )

    leave_rows = db.execute(
        text(
            f"""
            SELECT
              glr.id,
              glr.group_id,
              glr.approval_mode,
              g.name AS group_name,
              requester.name AS requester_name
            FROM group_leave_requests glr
            JOIN groups g ON g.id = glr.group_id
            JOIN users requester ON requester.id = glr.requester_user_id
            JOIN group_members gm ON gm.group_id = glr.group_id
            WHERE glr.status = 'pending'
              AND gm.user_id = :user_id
              AND gm.user_id != glr.requester_user_id
              AND {active_status_filter("gm")}
              AND NOT EXISTS (
                SELECT 1
                FROM group_leave_request_votes vote
                WHERE vote.request_id = glr.id
                  AND vote.voter_user_id = :user_id
              )
              AND (
                glr.approval_mode IN ('all_members', 'majority')
                OR (
                  glr.approval_mode = 'organizer'
                  AND gm.role IN ('organizer', 'co_organizer')
                )
              )
            ORDER BY glr.created_at DESC
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    for row in leave_rows:
        items.append(
            {
                "id": f"leave:{row['id']}",
                "type": "leave_request",
                "priority": "medium",
                "title": "Member leave request",
                "body": f"{row['requester_name']} wants to leave {row['group_name']}.",
                "related_group_id": row["group_id"],
                "related_url": f"/groups/{row['group_id']}",
            }
        )

    return {"items": items}