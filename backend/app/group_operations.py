import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import User

router = APIRouter(tags=["group operations"])


class GroupRulesUpdate(BaseModel):
    due_grace_days: int = Field(default=3, ge=0, le=30)
    proof_required: bool = True
    minimum_member_confirmations: int = Field(default=1, ge=0, le=50)
    late_payment_policy: str = Field(default="", max_length=3000)
    dispute_policy: str = Field(default="", max_length=3000)
    review_policy: str = Field(default="", max_length=3000)
    custom_rules: str | None = Field(default=None, max_length=5000)


class InviteControlsUpdate(BaseModel):
    invite_enabled: bool = True
    invite_approval_required: bool = False
    invite_expires_at: str | None = None
    invite_max_uses: int | None = Field(default=None, ge=1, le=10000)
    min_trust_score_to_join: int = Field(default=0, ge=0, le=100)
    public_invite_message: str | None = Field(default=None, max_length=2000)


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    body: str = Field(min_length=2, max_length=4000)
    priority: str = Field(default="normal", max_length=30)
    pinned: bool = False


class LatePaymentMark(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


class LatePaymentExplanation(BaseModel):
    member_explanation: str = Field(min_length=2, max_length=3000)


class LatePaymentResolve(BaseModel):
    organizer_note: str | None = Field(default=None, max_length=3000)
    status: str = Field(default="resolved", max_length=30)


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


def require_group_member(db: Session, group_id: str, user_id: str):
    member = db.execute(
        text(
            """
            SELECT *
            FROM group_members
            WHERE group_id = :group_id
              AND user_id = :user_id
              AND COALESCE(status, 'active') != 'removed_before_start'
            """
        ),
        {"group_id": group_id, "user_id": user_id},
    ).mappings().first()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    return member


def require_group_organizer(db: Session, group_id: str, user_id: str):
    member = require_group_member(db, group_id, user_id)

    if member.get("role") not in {"organizer", "co_organizer"}:
        raise HTTPException(status_code=403, detail="Only an organizer can manage this group setting")

    return member


def group_or_404(db: Session, group_id: str):
    group = db.execute(
        text(
            """
            SELECT *
            FROM groups
            WHERE id = :group_id
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    return group


def best_effort_audit_log(
    db: Session,
    group_id: str,
    actor_user_id: str,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
):
    if not table_exists(db, "audit_logs"):
        return

    columns = table_columns(db, "audit_logs")
    insert_columns: list[str] = []
    values: dict[str, Any] = {}

    def add(column: str, value: Any):
        if column in columns:
            insert_columns.append(column)
            values[column] = value

    add("id", new_id())
    add("group_id", group_id)
    add("actor_user_id", actor_user_id)
    add("user_id", actor_user_id)
    add("action", action)
    add("entity_type", entity_type)
    add("entity_id", entity_id)

    if "metadata" in columns:
        insert_columns.append("metadata")
        values["metadata"] = json.dumps(metadata or {}, default=str)

    if "details" in columns:
        insert_columns.append("details")
        values["details"] = json.dumps(metadata or {}, default=str)

    if "created_at" in columns:
        insert_columns.append("created_at")
        values["created_at"] = datetime.now(timezone.utc)

    if not insert_columns:
        return

    db.execute(
        text(
            f"""
            INSERT INTO audit_logs ({", ".join(insert_columns)})
            VALUES ({", ".join(f":{column}" for column in insert_columns)})
            """
        ),
        values,
    )


def latest_cycle(db: Session, group_id: str):
    return db.execute(
        text(
            """
            SELECT
              cy.*,
              receiver_user.name AS receiver_name,
              receiver_user.email AS receiver_email
            FROM cycles cy
            LEFT JOIN LATERAL (
              SELECT c.receiver_user_id
              FROM contributions c
              WHERE c.cycle_id = cy.id
              LIMIT 1
            ) receiver_lookup ON TRUE
            LEFT JOIN users receiver_user
              ON receiver_user.id = receiver_lookup.receiver_user_id
            WHERE cy.group_id = :group_id
            ORDER BY cy.cycle_number DESC
            LIMIT 1
            """
        ),
        {"group_id": group_id},
    ).mappings().first()


def current_contribution_stats(db: Session, cycle_id: str | None):
    if not cycle_id:
        return {
            "expected_total": 0,
            "paid_total": 0,
            "confirmed_total": 0,
            "pending_count": 0,
            "paid_count": 0,
            "confirmed_count": 0,
            "disputed_count": 0,
            "total_count": 0,
            "late_candidate_count": 0,
        }

    row = db.execute(
        text(
            """
            SELECT
              COALESCE(SUM(c.amount), 0) AS expected_total,
              COALESCE(SUM(CASE WHEN c.status IN ('paid', 'confirmed', 'group_verified') THEN c.amount ELSE 0 END), 0) AS paid_total,
              COALESCE(SUM(CASE WHEN c.status IN ('confirmed', 'group_verified') THEN c.amount ELSE 0 END), 0) AS confirmed_total,
              SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
              SUM(CASE WHEN c.status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
              SUM(CASE WHEN c.status IN ('confirmed', 'group_verified') THEN 1 ELSE 0 END) AS confirmed_count,
              SUM(CASE WHEN c.status = 'disputed' THEN 1 ELSE 0 END) AS disputed_count,
              COUNT(c.id) AS total_count,
              SUM(CASE WHEN c.status = 'pending' AND cy.due_date < NOW() THEN 1 ELSE 0 END) AS late_candidate_count
            FROM contributions c
            JOIN cycles cy ON cy.id = c.cycle_id
            WHERE c.cycle_id = :cycle_id
            """
        ),
        {"cycle_id": cycle_id},
    ).mappings().first()

    return dict(row or {})


@router.get("/groups/{group_id}/operations/command-center")
def group_command_center(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)
    group = group_or_404(db, group_id)
    cycle = latest_cycle(db, group_id)
    stats = current_contribution_stats(db, cycle["id"] if cycle else None)

    member_count = db.execute(
        text(
            """
            SELECT COUNT(*) AS count
            FROM group_members
            WHERE group_id = :group_id
              AND COALESCE(status, 'active') != 'removed_before_start'
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    pending_agreements = db.execute(
        text(
            """
            SELECT COUNT(*) AS count
            FROM group_members
            WHERE group_id = :group_id
              AND agreement_accepted_at IS NULL
              AND COALESCE(status, 'active') != 'removed_before_start'
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    open_disputes = 0
    if table_exists(db, "dispute_cases"):
        open_disputes = int(
            db.execute(
                text(
                    """
                    SELECT COUNT(*) AS count
                    FROM dispute_cases
                    WHERE group_id = :group_id
                      AND status IN ('open', 'under_review')
                    """
                ),
                {"group_id": group_id},
            ).mappings().first()["count"]
            or 0
        )

    open_late_cases = 0
    if table_exists(db, "late_payment_cases"):
        open_late_cases = int(
            db.execute(
                text(
                    """
                    SELECT COUNT(*) AS count
                    FROM late_payment_cases
                    WHERE group_id = :group_id
                      AND status = 'open'
                    """
                ),
                {"group_id": group_id},
            ).mappings().first()["count"]
            or 0
        )

    unread_messages = 0
    if table_exists(db, "chat_threads") and table_exists(db, "chat_messages") and table_exists(db, "chat_thread_members"):
        unread_row = db.execute(
            text(
                """
                SELECT COUNT(cm.id) AS count
                FROM chat_threads ct
                JOIN chat_thread_members ctm ON ctm.thread_id = ct.id
                JOIN chat_messages cm ON cm.thread_id = ct.id
                WHERE ct.type = 'group'
                  AND ct.group_id = :group_id
                  AND ctm.user_id = :user_id
                  AND cm.sender_user_id != :user_id
                  AND (ctm.last_read_at IS NULL OR cm.created_at > ctm.last_read_at)
                """
            ),
            {"group_id": group_id, "user_id": current_user.id},
        ).mappings().first()
        unread_messages = int(unread_row["count"] or 0)

    unacknowledged_announcements = 0
    if table_exists(db, "group_announcements"):
        ack_row = db.execute(
            text(
                """
                SELECT COUNT(ga.id) AS count
                FROM group_announcements ga
                LEFT JOIN group_announcement_acknowledgements ack
                  ON ack.announcement_id = ga.id
                 AND ack.user_id = :user_id
                WHERE ga.group_id = :group_id
                  AND ack.user_id IS NULL
                """
            ),
            {"group_id": group_id, "user_id": current_user.id},
        ).mappings().first()
        unacknowledged_announcements = int(ack_row["count"] or 0)

    next_action = "Review the group ledger."

    if int(pending_agreements["count"] or 0) > 0:
        next_action = "Ask members to accept the Circle Commitment."
    elif stats.get("late_candidate_count", 0):
        next_action = "Review late payment candidates."
    elif open_disputes > 0:
        next_action = "Resolve open dispute cases."
    elif stats.get("pending_count", 0):
        next_action = "Ask pending members to upload proof."
    elif stats.get("paid_count", 0):
        next_action = "Confirm uploaded payment proofs."
    elif unacknowledged_announcements > 0:
        next_action = "Read and acknowledge announcements."
    elif cycle and stats.get("total_count", 0) and stats.get("confirmed_count") == stats.get("total_count"):
        next_action = "Cycle looks complete. Prompt member reviews or open continuation vote."

    return {
        "group": dict(group),
        "current_cycle": dict(cycle) if cycle else None,
        "member_count": int(member_count["count"] or 0),
        "pending_agreements": int(pending_agreements["count"] or 0),
        "open_disputes": open_disputes,
        "open_late_cases": open_late_cases,
        "unread_messages": unread_messages,
        "unacknowledged_announcements": unacknowledged_announcements,
        "contribution_stats": stats,
        "next_action": next_action,
    }


@router.get("/groups/{group_id}/operations/rules")
def get_group_rules(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)
    group_or_404(db, group_id)

    row = db.execute(
        text(
            """
            SELECT *
            FROM group_rules
            WHERE group_id = :group_id
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    if row:
        return dict(row)

    return {
        "group_id": group_id,
        "due_grace_days": 3,
        "proof_required": True,
        "minimum_member_confirmations": 1,
        "late_payment_policy": "Members should upload proof before the due date. Late payments are tracked for transparency.",
        "dispute_policy": "Payment issues should be opened as structured disputes and resolved by the organizer or co-organizer.",
        "review_policy": "Members are encouraged to review each other after completed cycles.",
        "custom_rules": None,
    }


@router.put("/groups/{group_id}/operations/rules")
def update_group_rules(
    group_id: str,
    payload: GroupRulesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_organizer(db, group_id, current_user.id)
    group_or_404(db, group_id)

    row = db.execute(
        text(
            """
            INSERT INTO group_rules (
              group_id,
              due_grace_days,
              proof_required,
              minimum_member_confirmations,
              late_payment_policy,
              dispute_policy,
              review_policy,
              custom_rules,
              created_at,
              updated_at
            )
            VALUES (
              :group_id,
              :due_grace_days,
              :proof_required,
              :minimum_member_confirmations,
              :late_payment_policy,
              :dispute_policy,
              :review_policy,
              :custom_rules,
              NOW(),
              NOW()
            )
            ON CONFLICT (group_id)
            DO UPDATE SET
              due_grace_days = EXCLUDED.due_grace_days,
              proof_required = EXCLUDED.proof_required,
              minimum_member_confirmations = EXCLUDED.minimum_member_confirmations,
              late_payment_policy = EXCLUDED.late_payment_policy,
              dispute_policy = EXCLUDED.dispute_policy,
              review_policy = EXCLUDED.review_policy,
              custom_rules = EXCLUDED.custom_rules,
              updated_at = NOW()
            RETURNING *
            """
        ),
        {
            "group_id": group_id,
            "due_grace_days": payload.due_grace_days,
            "proof_required": payload.proof_required,
            "minimum_member_confirmations": payload.minimum_member_confirmations,
            "late_payment_policy": payload.late_payment_policy,
            "dispute_policy": payload.dispute_policy,
            "review_policy": payload.review_policy,
            "custom_rules": payload.custom_rules,
        },
    ).mappings().first()

    best_effort_audit_log(
        db,
        group_id,
        current_user.id,
        "group_rules_updated",
        "group",
        group_id,
        {"rules": payload.model_dump()},
    )

    db.commit()

    return dict(row)


@router.get("/groups/{group_id}/operations/member-responsibilities")
def member_responsibilities(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)
    group_or_404(db, group_id)

    cycle = latest_cycle(db, group_id)

    members = db.execute(
        text(
            """
            SELECT
              gm.id AS member_id,
              gm.user_id,
              gm.role,
              COALESCE(gm.status, 'active') AS member_status,
              gm.agreement_accepted_at,
              COALESCE(gm.has_received_payout, FALSE) AS has_received_payout,
              u.name,
              u.email,
              COALESCE(u.trust_score, 0) AS trust_score
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = :group_id
              AND COALESCE(gm.status, 'active') != 'removed_before_start'
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

    contribution_by_payer: dict[str, dict[str, Any]] = {}

    if cycle:
        contributions = db.execute(
            text(
                """
                SELECT
                  c.id,
                  c.payer_user_id,
                  c.amount,
                  c.status,
                  c.payment_reference,
                  c.proof_url,
                  c.updated_at,
                  cy.due_date
                FROM contributions c
                JOIN cycles cy ON cy.id = c.cycle_id
                WHERE c.cycle_id = :cycle_id
                """
            ),
            {"cycle_id": cycle["id"]},
        ).mappings().all()

        contribution_by_payer = {
            row["payer_user_id"]: dict(row)
            for row in contributions
        }

    open_dispute_contribution_ids: set[str] = set()

    if table_exists(db, "dispute_cases"):
        dispute_rows = db.execute(
            text(
                """
                SELECT contribution_id
                FROM dispute_cases
                WHERE group_id = :group_id
                  AND status IN ('open', 'under_review')
                """
            ),
            {"group_id": group_id},
        ).mappings().all()

        open_dispute_contribution_ids = {
            row["contribution_id"]
            for row in dispute_rows
            if row["contribution_id"]
        }

    open_late_contribution_ids: set[str] = set()

    if table_exists(db, "late_payment_cases"):
        late_rows = db.execute(
            text(
                """
                SELECT contribution_id
                FROM late_payment_cases
                WHERE group_id = :group_id
                  AND status = 'open'
                """
            ),
            {"group_id": group_id},
        ).mappings().all()

        open_late_contribution_ids = {
            row["contribution_id"]
            for row in late_rows
            if row["contribution_id"]
        }

    member_rows: list[dict[str, Any]] = []

    now = datetime.now(timezone.utc)

    for member in members:
        item = dict(member)
        contribution = contribution_by_payer.get(member["user_id"])

        if contribution:
            due_date = contribution.get("due_date")

            if due_date and due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)

            is_late_candidate = (
                contribution["status"] == "pending"
                and due_date is not None
                and due_date < now
            )

            item.update(
                {
                    "contribution_id": contribution["id"],
                    "amount": contribution["amount"],
                    "contribution_status": contribution["status"],
                    "payment_reference": contribution["payment_reference"],
                    "proof_url": contribution["proof_url"],
                    "contribution_updated_at": contribution["updated_at"],
                    "is_late_candidate": is_late_candidate,
                    "has_open_dispute": contribution["id"] in open_dispute_contribution_ids,
                    "has_open_late_case": contribution["id"] in open_late_contribution_ids,
                }
            )
        else:
            item.update(
                {
                    "contribution_id": None,
                    "amount": None,
                    "contribution_status": None,
                    "payment_reference": None,
                    "proof_url": None,
                    "contribution_updated_at": None,
                    "is_late_candidate": False,
                    "has_open_dispute": False,
                    "has_open_late_case": False,
                }
            )

        member_rows.append(item)

    return {
        "current_cycle": dict(cycle) if cycle else None,
        "members": member_rows,
    }

@router.get("/groups/{group_id}/operations/schedule")
def payment_schedule(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)
    group_or_404(db, group_id)

    rows = db.execute(
        text(
            """
            SELECT
              cy.id,
              cy.cycle_number,
              cy.status,
              cy.due_date,
              receiver_user.name AS receiver_name,
              receiver_user.email AS receiver_email,
              COUNT(c.id) AS contribution_count,
              COALESCE(SUM(c.amount), 0) AS expected_total,
              COALESCE(SUM(CASE WHEN c.status IN ('paid', 'confirmed', 'group_verified') THEN c.amount ELSE 0 END), 0) AS paid_total,
              COALESCE(SUM(CASE WHEN c.status IN ('confirmed', 'group_verified') THEN c.amount ELSE 0 END), 0) AS confirmed_total,
              SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
              SUM(CASE WHEN c.status = 'disputed' THEN 1 ELSE 0 END) AS disputed_count
            FROM cycles cy
            LEFT JOIN LATERAL (
              SELECT c2.receiver_user_id
              FROM contributions c2
              WHERE c2.cycle_id = cy.id
              LIMIT 1
            ) receiver_lookup ON TRUE
            LEFT JOIN users receiver_user
              ON receiver_user.id = receiver_lookup.receiver_user_id
            LEFT JOIN contributions c
              ON c.cycle_id = cy.id
            WHERE cy.group_id = :group_id
            GROUP BY
              cy.id,
              cy.cycle_number,
              cy.status,
              cy.due_date,
              receiver_user.name,
              receiver_user.email
            ORDER BY cy.cycle_number ASC
            """
        ),
        {"group_id": group_id},
    ).mappings().all()

    return {"cycles": [dict(row) for row in rows]}


@router.get("/groups/{group_id}/operations/late-payments")
def list_late_payments(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)
    group_or_404(db, group_id)

    candidates = db.execute(
        text(
            """
            SELECT
              c.id AS contribution_id,
              c.amount,
              c.status AS contribution_status,
              cy.id AS cycle_id,
              cy.cycle_number,
              cy.due_date,
              payer.id AS member_user_id,
              payer.name AS member_name,
              payer.email AS member_email
            FROM contributions c
            JOIN cycles cy ON cy.id = c.cycle_id
            JOIN users payer ON payer.id = c.payer_user_id
            LEFT JOIN late_payment_cases lpc ON lpc.contribution_id = c.id
            WHERE cy.group_id = :group_id
              AND c.status = 'pending'
              AND cy.due_date < NOW()
              AND lpc.id IS NULL
            ORDER BY cy.due_date ASC, payer.name ASC
            """
        ),
        {"group_id": group_id},
    ).mappings().all()

    cases = db.execute(
        text(
            """
            SELECT
              lpc.*,
              cy.cycle_number,
              cy.due_date,
              c.amount,
              c.status AS contribution_status,
              member.name AS member_name,
              member.email AS member_email,
              marker.name AS marked_by_name,
              resolver.name AS resolved_by_name
            FROM late_payment_cases lpc
            JOIN contributions c ON c.id = lpc.contribution_id
            LEFT JOIN cycles cy ON cy.id = lpc.cycle_id
            JOIN users member ON member.id = lpc.member_user_id
            LEFT JOIN users marker ON marker.id = lpc.marked_by_user_id
            LEFT JOIN users resolver ON resolver.id = lpc.resolved_by_user_id
            WHERE lpc.group_id = :group_id
            ORDER BY
              CASE lpc.status
                WHEN 'open' THEN 1
                WHEN 'excused' THEN 2
                WHEN 'resolved' THEN 3
                ELSE 4
              END,
              lpc.created_at DESC
            """
        ),
        {"group_id": group_id},
    ).mappings().all()

    return {
        "candidates": [dict(row) for row in candidates],
        "cases": [dict(row) for row in cases],
    }


@router.post("/contributions/{contribution_id}/late-payment")
def mark_late_payment(
    contribution_id: str,
    payload: LatePaymentMark,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.execute(
        text(
            """
            SELECT
              c.id AS contribution_id,
              c.cycle_id,
              c.payer_user_id,
              cy.group_id,
              cy.due_date
            FROM contributions c
            JOIN cycles cy ON cy.id = c.cycle_id
            WHERE c.id = :contribution_id
            """
        ),
        {"contribution_id": contribution_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Contribution not found")

    require_group_organizer(db, row["group_id"], current_user.id)

    late_case = db.execute(
        text(
            """
            INSERT INTO late_payment_cases (
              id,
              group_id,
              contribution_id,
              cycle_id,
              member_user_id,
              marked_by_user_id,
              status,
              reason,
              created_at,
              updated_at
            )
            VALUES (
              :id,
              :group_id,
              :contribution_id,
              :cycle_id,
              :member_user_id,
              :marked_by_user_id,
              'open',
              :reason,
              NOW(),
              NOW()
            )
            ON CONFLICT (contribution_id)
            DO UPDATE SET
              status = 'open',
              reason = EXCLUDED.reason,
              marked_by_user_id = EXCLUDED.marked_by_user_id,
              updated_at = NOW()
            RETURNING *
            """
        ),
        {
            "id": new_id(),
            "group_id": row["group_id"],
            "contribution_id": row["contribution_id"],
            "cycle_id": row["cycle_id"],
            "member_user_id": row["payer_user_id"],
            "marked_by_user_id": current_user.id,
            "reason": payload.reason,
        },
    ).mappings().first()

    best_effort_audit_log(
        db,
        row["group_id"],
        current_user.id,
        "late_payment_marked",
        "contribution",
        contribution_id,
        {"reason": payload.reason},
    )

    db.commit()

    return dict(late_case)


@router.post("/late-payments/{case_id}/explanation")
def add_late_payment_explanation(
    case_id: str,
    payload: LatePaymentExplanation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    late_case = db.execute(
        text(
            """
            SELECT *
            FROM late_payment_cases
            WHERE id = :case_id
            """
        ),
        {"case_id": case_id},
    ).mappings().first()

    if not late_case:
        raise HTTPException(status_code=404, detail="Late payment case not found")

    require_group_member(db, late_case["group_id"], current_user.id)

    if late_case["member_user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only the late member can add an explanation")

    row = db.execute(
        text(
            """
            UPDATE late_payment_cases
            SET member_explanation = :member_explanation,
                updated_at = NOW()
            WHERE id = :case_id
            RETURNING *
            """
        ),
        {"case_id": case_id, "member_explanation": payload.member_explanation},
    ).mappings().first()

    best_effort_audit_log(
        db,
        late_case["group_id"],
        current_user.id,
        "late_payment_explanation_added",
        "late_payment_case",
        case_id,
        {},
    )

    db.commit()

    return dict(row)


@router.post("/late-payments/{case_id}/reminder")
def send_late_payment_reminder(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    late_case = db.execute(
        text(
            """
            SELECT *
            FROM late_payment_cases
            WHERE id = :case_id
            """
        ),
        {"case_id": case_id},
    ).mappings().first()

    if not late_case:
        raise HTTPException(status_code=404, detail="Late payment case not found")

    require_group_organizer(db, late_case["group_id"], current_user.id)

    row = db.execute(
        text(
            """
            UPDATE late_payment_cases
            SET reminder_count = reminder_count + 1,
                last_reminder_at = NOW(),
                updated_at = NOW()
            WHERE id = :case_id
            RETURNING *
            """
        ),
        {"case_id": case_id},
    ).mappings().first()

    best_effort_audit_log(
        db,
        late_case["group_id"],
        current_user.id,
        "late_payment_reminder_recorded",
        "late_payment_case",
        case_id,
        {},
    )

    db.commit()

    return dict(row)


@router.post("/late-payments/{case_id}/resolve")
def resolve_late_payment(
    case_id: str,
    payload: LatePaymentResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status = payload.status.strip().lower()

    if status not in {"resolved", "excused"}:
        raise HTTPException(status_code=400, detail="Status must be resolved or excused")

    late_case = db.execute(
        text(
            """
            SELECT *
            FROM late_payment_cases
            WHERE id = :case_id
            """
        ),
        {"case_id": case_id},
    ).mappings().first()

    if not late_case:
        raise HTTPException(status_code=404, detail="Late payment case not found")

    require_group_organizer(db, late_case["group_id"], current_user.id)

    row = db.execute(
        text(
            """
            UPDATE late_payment_cases
            SET status = :status,
                organizer_note = :organizer_note,
                resolved_by_user_id = :resolved_by_user_id,
                resolved_at = NOW(),
                updated_at = NOW()
            WHERE id = :case_id
            RETURNING *
            """
        ),
        {
            "case_id": case_id,
            "status": status,
            "organizer_note": payload.organizer_note,
            "resolved_by_user_id": current_user.id,
        },
    ).mappings().first()

    best_effort_audit_log(
        db,
        late_case["group_id"],
        current_user.id,
        f"late_payment_{status}",
        "late_payment_case",
        case_id,
        {"organizer_note": payload.organizer_note},
    )

    db.commit()

    return dict(row)


@router.get("/groups/{group_id}/operations/announcements")
def list_announcements(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)
    group_or_404(db, group_id)

    rows = db.execute(
        text(
            """
            SELECT
              ga.*,
              author.name AS author_name,
              author.email AS author_email,
              CASE WHEN ack.user_id IS NULL THEN FALSE ELSE TRUE END AS acknowledged_by_me,
              (
                SELECT COUNT(*)
                FROM group_announcement_acknowledgements ack2
                WHERE ack2.announcement_id = ga.id
              ) AS acknowledgement_count
            FROM group_announcements ga
            JOIN users author ON author.id = ga.author_user_id
            LEFT JOIN group_announcement_acknowledgements ack
              ON ack.announcement_id = ga.id
             AND ack.user_id = :user_id
            WHERE ga.group_id = :group_id
            ORDER BY ga.pinned DESC, ga.created_at DESC
            """
        ),
        {"group_id": group_id, "user_id": current_user.id},
    ).mappings().all()

    return {"announcements": [dict(row) for row in rows]}


@router.post("/groups/{group_id}/operations/announcements")
def create_announcement(
    group_id: str,
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_organizer(db, group_id, current_user.id)
    group_or_404(db, group_id)

    priority = payload.priority.strip().lower()
    if priority not in {"normal", "important", "urgent"}:
        raise HTTPException(status_code=400, detail="Priority must be normal, important, or urgent")

    row = db.execute(
        text(
            """
            INSERT INTO group_announcements (
              id,
              group_id,
              author_user_id,
              title,
              body,
              priority,
              pinned,
              created_at,
              updated_at
            )
            VALUES (
              :id,
              :group_id,
              :author_user_id,
              :title,
              :body,
              :priority,
              :pinned,
              NOW(),
              NOW()
            )
            RETURNING *
            """
        ),
        {
            "id": new_id(),
            "group_id": group_id,
            "author_user_id": current_user.id,
            "title": payload.title,
            "body": payload.body,
            "priority": priority,
            "pinned": payload.pinned,
        },
    ).mappings().first()

    best_effort_audit_log(
        db,
        group_id,
        current_user.id,
        "group_announcement_created",
        "announcement",
        row["id"],
        {"title": payload.title, "priority": priority},
    )

    db.commit()

    return dict(row)


@router.post("/announcements/{announcement_id}/acknowledge")
def acknowledge_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = db.execute(
        text(
            """
            SELECT *
            FROM group_announcements
            WHERE id = :announcement_id
            """
        ),
        {"announcement_id": announcement_id},
    ).mappings().first()

    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    require_group_member(db, announcement["group_id"], current_user.id)

    db.execute(
        text(
            """
            INSERT INTO group_announcement_acknowledgements (
              announcement_id,
              user_id,
              acknowledged_at
            )
            VALUES (
              :announcement_id,
              :user_id,
              NOW()
            )
            ON CONFLICT (announcement_id, user_id)
            DO UPDATE SET acknowledged_at = NOW()
            """
        ),
        {"announcement_id": announcement_id, "user_id": current_user.id},
    )

    db.commit()

    return {"acknowledged": True}


@router.get("/groups/{group_id}/operations/invite-controls")
def get_invite_controls(
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
        "invite_approval_required": group.get("invite_approval_required", False),
        "invite_expires_at": group.get("invite_expires_at"),
        "invite_max_uses": group.get("invite_max_uses"),
        "invite_uses": group.get("invite_uses", 0),
        "min_trust_score_to_join": group.get("min_trust_score_to_join", 0),
        "public_invite_message": group.get("public_invite_message"),
    }


@router.put("/groups/{group_id}/operations/invite-controls")
def update_invite_controls(
    group_id: str,
    payload: InviteControlsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_organizer(db, group_id, current_user.id)
    group_or_404(db, group_id)

    invite_expires_at = None
    if payload.invite_expires_at:
        invite_expires_at = datetime.fromisoformat(payload.invite_expires_at.replace("Z", "+00:00"))

    row = db.execute(
        text(
            """
            UPDATE groups
            SET invite_enabled = :invite_enabled,
                invite_approval_required = :invite_approval_required,
                invite_expires_at = :invite_expires_at,
                invite_max_uses = :invite_max_uses,
                min_trust_score_to_join = :min_trust_score_to_join,
                public_invite_message = :public_invite_message
            WHERE id = :group_id
            RETURNING
              id AS group_id,
              invite_code,
              invite_enabled,
              invite_approval_required,
              invite_expires_at,
              invite_max_uses,
              invite_uses,
              min_trust_score_to_join,
              public_invite_message
            """
        ),
        {
            "group_id": group_id,
            "invite_enabled": payload.invite_enabled,
            "invite_approval_required": payload.invite_approval_required,
            "invite_expires_at": invite_expires_at,
            "invite_max_uses": payload.invite_max_uses,
            "min_trust_score_to_join": payload.min_trust_score_to_join,
            "public_invite_message": payload.public_invite_message,
        },
    ).mappings().first()

    best_effort_audit_log(
        db,
        group_id,
        current_user.id,
        "invite_controls_updated",
        "group",
        group_id,
        payload.model_dump(),
    )

    db.commit()

    return dict(row)


@router.post("/group-invites/{invite_code}/join")
def controlled_join_by_invite(
    invite_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.execute(
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

    if not group:
        raise HTTPException(status_code=404, detail="Invite not found")

    if not group.get("invite_enabled", True):
        raise HTTPException(status_code=403, detail="This invite link is currently disabled")

    if group.get("invite_expires_at") and group["invite_expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="This invite link has expired")

    if group.get("invite_max_uses") is not None and int(group.get("invite_uses") or 0) >= int(group["invite_max_uses"]):
        raise HTTPException(status_code=403, detail="This invite link has reached its use limit")

    if group.get("status") in {"archived", "closed", "active_locked"}:
        raise HTTPException(status_code=403, detail="This group is not accepting direct joins")

    existing_member = db.execute(
        text(
            """
            SELECT *
            FROM group_members
            WHERE group_id = :group_id
              AND user_id = :user_id
              AND COALESCE(status, 'active') != 'removed_before_start'
            """
        ),
        {"group_id": group["id"], "user_id": current_user.id},
    ).mappings().first()

    if existing_member:
        return {
            "status": "already_member",
            "group": dict(group),
        }

    member_count = int(
        db.execute(
            text(
                """
                SELECT COUNT(*) AS count
                FROM group_members
                WHERE group_id = :group_id
                  AND COALESCE(status, 'active') != 'removed_before_start'
                """
            ),
            {"group_id": group["id"]},
        ).mappings().first()["count"]
        or 0
    )

    if member_count >= int(group["member_limit"] or 0):
        raise HTTPException(status_code=403, detail="This group is already full")

    if int(current_user.trust_score or 0) < int(group.get("min_trust_score_to_join") or 0):
        raise HTTPException(status_code=403, detail="Your trust score does not meet this group's invite requirement")

    if group.get("invite_approval_required", False):
        if not table_exists(db, "group_join_requests"):
            raise HTTPException(status_code=400, detail="Join request table is not available")

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
                ON CONFLICT (group_id, requester_user_id)
                DO UPDATE SET
                  status = 'pending',
                  updated_at = NOW()
                """
            ),
            {
                "id": new_id(),
                "group_id": group["id"],
                "requester_user_id": current_user.id,
                "message": "Requested to join from public invite link.",
            },
        )

        db.commit()

        return {
            "status": "approval_required",
            "group": dict(group),
        }

    columns = table_columns(db, "group_members")
    insert_columns: list[str] = []
    values: dict[str, Any] = {}

    def add(column: str, value: Any):
        if column in columns:
            insert_columns.append(column)
            values[column] = value

    add("id", new_id())
    add("group_id", group["id"])
    add("user_id", current_user.id)
    add("role", "member")

    member_status = "pending_agreement" if group.get("agreement_required", True) else "active"
    add("status", member_status)
    add("agreement_version", group.get("agreement_version", 1))
    add("has_received_payout", False)
    add("joined_at", datetime.now(timezone.utc))
    add("created_at", datetime.now(timezone.utc))
    add("updated_at", datetime.now(timezone.utc))

    if not {"group_id", "user_id"}.issubset(set(insert_columns)):
        raise HTTPException(status_code=500, detail="Group member table is missing required columns")

    db.execute(
        text(
            f"""
            INSERT INTO group_members ({", ".join(insert_columns)})
            VALUES ({", ".join(f":{column}" for column in insert_columns)})
            """
        ),
        values,
    )

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

    best_effort_audit_log(
        db,
        group["id"],
        current_user.id,
        "member_joined_from_controlled_invite",
        "group",
        group["id"],
        {"invite_code": invite_code},
    )

    db.commit()

    refreshed_group = db.execute(
        text(
            """
            SELECT *
            FROM groups
            WHERE id = :group_id
            """
        ),
        {"group_id": group["id"]},
    ).mappings().first()

    return {
        "status": "joined",
        "group": dict(refreshed_group or group),
    }