import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import User

router = APIRouter()


class NotificationPreferencesIn(BaseModel):
    payment_reminders: bool = True
    group_messages: bool = True
    connection_requests: bool = True
    join_requests: bool = True
    agreement_reminders: bool = True
    vote_reminders: bool = True
    review_reminders: bool = True
    email_notifications: bool = False


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_execute(db: Session, sql: str, params: dict[str, Any] | None = None):
    try:
        return db.execute(text(sql), params or {})
    except Exception:
        db.rollback()
        return None


def safe_tags(raw: str | None) -> list[str]:
    if not raw:
        return []

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except Exception:
        return []

    return []


def ensure_notification_preferences(db: Session, user_id: str):
    db.execute(
        text(
            """
            INSERT INTO notification_preferences (user_id, created_at, updated_at)
            VALUES (:user_id, NOW(), NOW())
            ON CONFLICT (user_id) DO NOTHING
            """
        ),
        {"user_id": user_id},
    )
    db.commit()


def get_notification_preferences_row(db: Session, user_id: str):
    ensure_notification_preferences(db, user_id)

    return db.execute(
        text(
            """
            SELECT *
            FROM notification_preferences
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().first()


def notification_type_allowed(preferences: dict[str, Any], item_type: str) -> bool:
    mapping = {
        "payment_due": "payment_reminders",
        "confirmation_waiting": "payment_reminders",
        "agreement_waiting": "agreement_reminders",
        "organizer_agreement_waiting": "agreement_reminders",
        "continuation_vote": "vote_reminders",
        "join_request": "join_requests",
        "unread_message": "group_messages",
        "review_waiting": "review_reminders",
        "connection_request": "connection_requests",
    }

    key = mapping.get(item_type)

    if not key:
        return True

    return bool(preferences.get(key, True))


def compute_action_items(db: Session, user_id: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    pending_agreements = safe_execute(
        db,
        """
        SELECT
          g.id AS group_id,
          g.name AS group_name,
          gm.status
        FROM group_members gm
        JOIN groups g ON g.id = gm.group_id
        WHERE gm.user_id = :user_id
          AND gm.status = 'pending_agreement'
          AND COALESCE(g.status, '') != 'archived'
        ORDER BY g.created_at DESC
        LIMIT 10
        """,
        {"user_id": user_id},
    )

    if pending_agreements:
        for row in pending_agreements.mappings().all():
            items.append(
                {
                    "id": f"agreement:{row['group_id']}",
                    "type": "agreement_waiting",
                    "priority": "high",
                    "title": "Accept Circle Commitment",
                    "body": f"{row['group_name']} is waiting for your agreement before the circle can fully start.",
                    "group_id": row["group_id"],
                    "group_name": row["group_name"],
                    "url": f"/groups/{row['group_id']}",
                    "created_at": now_iso(),
                }
            )

    payment_due = safe_execute(
        db,
        """
        SELECT
          c.id AS contribution_id,
          c.amount,
          c.status,
          g.id AS group_id,
          g.name AS group_name,
          g.currency,
          cy.due_date,
          receiver.name AS receiver_name
        FROM contributions c
        JOIN cycles cy ON cy.id = c.cycle_id
        JOIN groups g ON g.id = cy.group_id
        JOIN users receiver ON receiver.id = c.receiver_user_id
        WHERE c.payer_user_id = :user_id
          AND c.status = 'pending'
          AND COALESCE(g.status, '') != 'archived'
        ORDER BY cy.due_date ASC
        LIMIT 10
        """,
        {"user_id": user_id},
    )

    if payment_due:
        for row in payment_due.mappings().all():
            items.append(
                {
                    "id": f"payment:{row['contribution_id']}",
                    "type": "payment_due",
                    "priority": "high",
                    "title": "Upload payment proof",
                    "body": f"Pay {row['amount']} {row['currency']} to {row['receiver_name']} for {row['group_name']} and upload proof.",
                    "group_id": row["group_id"],
                    "group_name": row["group_name"],
                    "url": f"/groups/{row['group_id']}",
                    "created_at": now_iso(),
                }
            )

    confirmation_waiting = safe_execute(
        db,
        """
        SELECT
          c.id AS contribution_id,
          c.amount,
          g.id AS group_id,
          g.name AS group_name,
          g.currency,
          payer.name AS payer_name
        FROM contributions c
        JOIN cycles cy ON cy.id = c.cycle_id
        JOIN groups g ON g.id = cy.group_id
        JOIN users payer ON payer.id = c.payer_user_id
        WHERE c.receiver_user_id = :user_id
          AND c.status = 'paid'
          AND COALESCE(g.status, '') != 'archived'
        ORDER BY c.updated_at DESC
        LIMIT 10
        """,
        {"user_id": user_id},
    )

    if confirmation_waiting:
        for row in confirmation_waiting.mappings().all():
            items.append(
                {
                    "id": f"confirm:{row['contribution_id']}",
                    "type": "confirmation_waiting",
                    "priority": "high",
                    "title": "Confirm payment receipt",
                    "body": f"{row['payer_name']} uploaded proof for {row['amount']} {row['currency']} in {row['group_name']}.",
                    "group_id": row["group_id"],
                    "group_name": row["group_name"],
                    "url": f"/groups/{row['group_id']}",
                    "created_at": now_iso(),
                }
            )

    vote_waiting = safe_execute(
        db,
        """
        SELECT
          g.id AS group_id,
          g.name AS group_name
        FROM groups g
        JOIN group_members gm ON gm.group_id = g.id
        WHERE gm.user_id = :user_id
          AND gm.status = 'active'
          AND g.status = 'cycle_review'
          AND g.continuation_vote_cycle_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM group_continuation_votes v
            WHERE v.group_id = g.id
              AND v.cycle_id = g.continuation_vote_cycle_id
              AND v.voter_user_id = :user_id
          )
        ORDER BY g.continuation_vote_opened_at DESC
        LIMIT 10
        """,
        {"user_id": user_id},
    )

    if vote_waiting:
        for row in vote_waiting.mappings().all():
            items.append(
                {
                    "id": f"vote:{row['group_id']}",
                    "type": "continuation_vote",
                    "priority": "medium",
                    "title": "Continuation vote open",
                    "body": f"{row['group_name']} is asking whether the group should continue or stop.",
                    "group_id": row["group_id"],
                    "group_name": row["group_name"],
                    "url": f"/groups/{row['group_id']}",
                    "created_at": now_iso(),
                }
            )

    organizer_agreements = safe_execute(
        db,
        """
        SELECT
          g.id AS group_id,
          g.name AS group_name,
          COUNT(gm.id) AS waiting_count
        FROM groups g
        JOIN group_members gm ON gm.group_id = g.id
        WHERE g.organizer_id = :user_id
          AND gm.status = 'pending_agreement'
          AND COALESCE(g.status, '') != 'archived'
        GROUP BY g.id, g.name
        ORDER BY waiting_count DESC
        LIMIT 10
        """,
        {"user_id": user_id},
    )

    if organizer_agreements:
        for row in organizer_agreements.mappings().all():
            items.append(
                {
                    "id": f"organizer-agreement:{row['group_id']}",
                    "type": "organizer_agreement_waiting",
                    "priority": "medium",
                    "title": "Members need to accept agreement",
                    "body": f"{row['waiting_count']} member(s) still need to accept the Circle Commitment in {row['group_name']}.",
                    "group_id": row["group_id"],
                    "group_name": row["group_name"],
                    "url": f"/groups/{row['group_id']}",
                    "created_at": now_iso(),
                }
            )

    join_requests = safe_execute(
        db,
        """
        SELECT
          g.id AS group_id,
          g.name AS group_name,
          COUNT(r.id) AS request_count
        FROM group_join_requests r
        JOIN groups g ON g.id = r.group_id
        WHERE g.organizer_id = :user_id
          AND r.status = 'pending'
        GROUP BY g.id, g.name
        ORDER BY request_count DESC
        LIMIT 10
        """,
        {"user_id": user_id},
    )

    if join_requests:
        for row in join_requests.mappings().all():
            items.append(
                {
                    "id": f"join-requests:{row['group_id']}",
                    "type": "join_request",
                    "priority": "medium",
                    "title": "Join requests waiting",
                    "body": f"{row['request_count']} person(s) requested to join {row['group_name']}.",
                    "group_id": row["group_id"],
                    "group_name": row["group_name"],
                    "url": f"/groups/{row['group_id']}",
                    "created_at": now_iso(),
                }
            )

    unread_messages = safe_execute(
        db,
        """
        SELECT
          t.id AS thread_id,
          t.type,
          t.group_id,
          COALESCE(g.name, STRING_AGG(other_user.name, ', ')) AS label,
          last_message.body AS last_message,
          last_message.created_at AS last_message_at
        FROM chat_thread_members me
        JOIN chat_threads t ON t.id = me.thread_id
        LEFT JOIN groups g ON g.id = t.group_id
        LEFT JOIN chat_thread_members other_member
          ON other_member.thread_id = t.id
          AND other_member.user_id != :user_id
        LEFT JOIN users other_user ON other_user.id = other_member.user_id
        JOIN LATERAL (
          SELECT body, sender_user_id, created_at
          FROM chat_messages
          WHERE thread_id = t.id
            AND deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1
        ) AS last_message ON TRUE
        WHERE me.user_id = :user_id
          AND last_message.sender_user_id != :user_id
          AND (
            me.last_read_at IS NULL
            OR last_message.created_at > me.last_read_at
          )
        GROUP BY
          t.id,
          t.type,
          t.group_id,
          g.name,
          last_message.body,
          last_message.created_at
        ORDER BY last_message.created_at DESC
        LIMIT 10
        """,
        {"user_id": user_id},
    )

    if unread_messages:
        for row in unread_messages.mappings().all():
            items.append(
                {
                    "id": f"message:{row['thread_id']}",
                    "type": "unread_message",
                    "priority": "low",
                    "title": "Unread message",
                    "body": f"New message in {row['label'] or 'chat'}: {row['last_message']}",
                    "group_id": row["group_id"],
                    "group_name": row["label"],
                    "thread_id": row["thread_id"],
                    "url": "/messages",
                    "created_at": now_iso(),
                }
            )

    priority_order = {"high": 0, "medium": 1, "low": 2}

    return sorted(items, key=lambda item: priority_order.get(item["priority"], 9))


def generate_notifications(db: Session, user_id: str):
    preferences = dict(get_notification_preferences_row(db, user_id))
    items = compute_action_items(db, user_id)

    for item in items:
        if not notification_type_allowed(preferences, item["type"]):
            continue

        db.execute(
            text(
                """
                INSERT INTO notifications (
                  id,
                  user_id,
                  type,
                  title,
                  body,
                  related_group_id,
                  related_thread_id,
                  related_url,
                  dedupe_key,
                  created_at,
                  updated_at
                )
                VALUES (
                  :id,
                  :user_id,
                  :type,
                  :title,
                  :body,
                  :related_group_id,
                  :related_thread_id,
                  :related_url,
                  :dedupe_key,
                  NOW(),
                  NOW()
                )
                ON CONFLICT (user_id, dedupe_key)
                DO UPDATE SET
                  title = EXCLUDED.title,
                  body = EXCLUDED.body,
                  related_group_id = EXCLUDED.related_group_id,
                  related_thread_id = EXCLUDED.related_thread_id,
                  related_url = EXCLUDED.related_url,
                  updated_at = NOW()
                """
            ),
            {
                "id": new_id(),
                "user_id": user_id,
                "type": item["type"],
                "title": item["title"],
                "body": item["body"],
                "related_group_id": item.get("group_id"),
                "related_thread_id": item.get("thread_id"),
                "related_url": item.get("url"),
                "dedupe_key": item["id"],
            },
        )

    db.commit()


def trust_passport_data(db: Session, user_id: str):
    user_row = db.execute(
        text(
            """
            SELECT id, name, email, trust_score, verification_status, created_at
            FROM users
            WHERE id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().first()

    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    groups = safe_execute(
        db,
        """
        SELECT
          COUNT(DISTINCT gm.group_id) AS groups_total,
          COUNT(DISTINCT CASE WHEN g.status IN ('completed', 'archived') OR g.completed_at IS NOT NULL THEN gm.group_id END) AS groups_completed,
          COUNT(DISTINCT CASE WHEN gm.role IN ('organizer', 'co_organizer') THEN gm.group_id END) AS groups_organized
        FROM group_members gm
        JOIN groups g ON g.id = gm.group_id
        WHERE gm.user_id = :user_id
          AND gm.status != 'removed_before_start'
        """,
        {"user_id": user_id},
    )

    group_row = groups.mappings().first() if groups else {}

    contributions = safe_execute(
        db,
        """
        SELECT
          COUNT(c.id) AS contribution_count,
          COUNT(CASE WHEN c.status IN ('paid', 'confirmed', 'group_verified') THEN 1 END) AS marked_paid_count,
          COUNT(CASE WHEN c.status IN ('confirmed', 'group_verified') THEN 1 END) AS confirmed_count,
          COUNT(CASE WHEN c.status = 'disputed' THEN 1 END) AS disputed_count,
          COUNT(CASE WHEN c.paid_at IS NOT NULL AND c.paid_at <= cy.due_date THEN 1 END) AS on_time_count
        FROM contributions c
        JOIN cycles cy ON cy.id = c.cycle_id
        WHERE c.payer_user_id = :user_id
        """,
        {"user_id": user_id},
    )

    contribution_row = contributions.mappings().first() if contributions else {}

    receiver = safe_execute(
        db,
        """
        SELECT
          COUNT(c.id) AS receiver_rows,
          COUNT(CASE WHEN c.status IN ('confirmed', 'group_verified') THEN 1 END) AS receiver_confirmed_rows
        FROM contributions c
        WHERE c.receiver_user_id = :user_id
          AND c.status IN ('paid', 'confirmed', 'group_verified', 'disputed')
        """,
        {"user_id": user_id},
    )

    receiver_row = receiver.mappings().first() if receiver else {}

    reviews = safe_execute(
        db,
        """
        SELECT
          COALESCE(AVG(rating), 0) AS average_rating,
          COUNT(id) AS review_count
        FROM member_reviews
        WHERE reviewed_user_id = :user_id
          AND visibility = 'network'
        """,
        {"user_id": user_id},
    )

    review_row = reviews.mappings().first() if reviews else {}

    review_tags = safe_execute(
        db,
        """
        SELECT tags
        FROM member_reviews
        WHERE reviewed_user_id = :user_id
          AND visibility = 'network'
        """,
        {"user_id": user_id},
    )

    tag_counts: dict[str, int] = {}

    if review_tags:
        for row in review_tags.mappings().all():
            for tag in safe_tags(row["tags"]):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    connections = safe_execute(
        db,
        """
        SELECT COUNT(id) AS accepted_connections
        FROM connection_requests
        WHERE status = 'accepted'
          AND (
            requester_user_id = :user_id
            OR receiver_user_id = :user_id
          )
        """,
        {"user_id": user_id},
    )

    connection_row = connections.mappings().first() if connections else {}

    contribution_count = int(contribution_row.get("contribution_count") or 0)
    marked_paid_count = int(contribution_row.get("marked_paid_count") or 0)
    confirmed_count = int(contribution_row.get("confirmed_count") or 0)
    disputed_count = int(contribution_row.get("disputed_count") or 0)
    on_time_count = int(contribution_row.get("on_time_count") or 0)

    receiver_rows = int(receiver_row.get("receiver_rows") or 0)
    receiver_confirmed_rows = int(receiver_row.get("receiver_confirmed_rows") or 0)

    on_time_rate = round((on_time_count / marked_paid_count) * 100) if marked_paid_count else None
    confirmation_rate = round((confirmed_count / contribution_count) * 100) if contribution_count else None
    receiver_confirmation_rate = round((receiver_confirmed_rows / receiver_rows) * 100) if receiver_rows else None
    dispute_rate = round((disputed_count / contribution_count) * 100) if contribution_count else 0

    trust_score = int(user_row["trust_score"] or 0)
    review_count = int(review_row.get("review_count") or 0)
    groups_completed = int(group_row.get("groups_completed") or 0)

    if trust_score >= 85 and groups_completed >= 3 and review_count >= 3:
        level = "Strong community history"
    elif trust_score >= 70 and (groups_completed >= 1 or review_count >= 1):
        level = "Trusted member"
    elif contribution_count > 0:
        level = "Building trust"
    else:
        level = "New member"

    return {
        "user": dict(user_row),
        "level": level,
        "summary": {
            "groups_total": int(group_row.get("groups_total") or 0),
            "groups_completed": groups_completed,
            "groups_organized": int(group_row.get("groups_organized") or 0),
            "accepted_connections": int(connection_row.get("accepted_connections") or 0),
            "average_rating": round(float(review_row.get("average_rating") or 0), 1),
            "review_count": review_count,
            "trust_score": trust_score,
        },
        "metrics": {
            "contribution_count": contribution_count,
            "marked_paid_count": marked_paid_count,
            "confirmed_count": confirmed_count,
            "disputed_count": disputed_count,
            "on_time_rate": on_time_rate,
            "confirmation_rate": confirmation_rate,
            "receiver_confirmation_rate": receiver_confirmation_rate,
            "dispute_rate": dispute_rate,
        },
        "top_tags": [
            {"tag": tag, "count": count}
            for tag, count in sorted(tag_counts.items(), key=lambda item: item[1], reverse=True)[:8]
        ],
        "disclaimer": "Trust Passport is based only on Rota activity. It is not a credit score, financial guarantee, or identity guarantee.",
    }


@router.get("/action-items")
def action_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "items": compute_action_items(db, current_user.id),
    }


@router.get("/notifications")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    generate_notifications(db, current_user.id)

    rows = db.execute(
        text(
            """
            SELECT *
            FROM notifications
            WHERE user_id = :user_id
            ORDER BY
              CASE WHEN read_at IS NULL THEN 0 ELSE 1 END,
              created_at DESC
            LIMIT 100
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    unread_count = db.execute(
        text(
            """
            SELECT COUNT(id)
            FROM notifications
            WHERE user_id = :user_id
              AND read_at IS NULL
            """
        ),
        {"user_id": current_user.id},
    ).scalar()

    return {
        "unread_count": int(unread_count or 0),
        "notifications": [dict(row) for row in rows],
    }


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.execute(
        text(
            """
            UPDATE notifications
            SET read_at = NOW(),
                updated_at = NOW()
            WHERE id = :notification_id
              AND user_id = :user_id
            RETURNING id
            """
        ),
        {
            "notification_id": notification_id,
            "user_id": current_user.id,
        },
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.commit()

    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(
        text(
            """
            UPDATE notifications
            SET read_at = NOW(),
                updated_at = NOW()
            WHERE user_id = :user_id
              AND read_at IS NULL
            """
        ),
        {"user_id": current_user.id},
    )

    db.commit()

    return {"ok": True}


@router.get("/settings/profile")
def profile_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preferences = dict(get_notification_preferences_row(db, current_user.id))

    discovery = safe_execute(
        db,
        """
        SELECT *
        FROM discovery_profiles
        WHERE user_id = :user_id
        """,
        {"user_id": current_user.id},
    )

    discovery_row = discovery.mappings().first() if discovery else None

    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone,
            "trust_score": current_user.trust_score,
            "verification_status": current_user.verification_status,
        },
        "discovery_profile": dict(discovery_row) if discovery_row else None,
        "notification_preferences": preferences,
        "trust_passport": trust_passport_data(db, current_user.id),
    }


@router.put("/settings/notifications")
def update_notification_preferences(
    payload: NotificationPreferencesIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_notification_preferences(db, current_user.id)

    db.execute(
        text(
            """
            UPDATE notification_preferences
            SET payment_reminders = :payment_reminders,
                group_messages = :group_messages,
                connection_requests = :connection_requests,
                join_requests = :join_requests,
                agreement_reminders = :agreement_reminders,
                vote_reminders = :vote_reminders,
                review_reminders = :review_reminders,
                email_notifications = :email_notifications,
                updated_at = NOW()
            WHERE user_id = :user_id
            """
        ),
        {
            "user_id": current_user.id,
            **payload.model_dump(),
        },
    )

    db.commit()

    return {"ok": True, "message": "Notification preferences saved."}


@router.get("/trust-passport/me")
def my_trust_passport(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return trust_passport_data(db, current_user.id)


@router.get("/users/{user_id}/trust-passport")
def user_trust_passport(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return trust_passport_data(db, user_id)


@router.get("/groups/{group_id}/health")
def group_health(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    member = db.execute(
        text(
            """
            SELECT *
            FROM group_members
            WHERE group_id = :group_id
              AND user_id = :user_id
              AND status != 'removed_before_start'
            """
        ),
        {
            "group_id": group_id,
            "user_id": current_user.id,
        },
    ).mappings().first()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    member_stats = db.execute(
        text(
            """
            SELECT
              COUNT(id) AS total_members,
              COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_members,
              COUNT(CASE WHEN status = 'pending_agreement' THEN 1 END) AS pending_agreements,
              COUNT(CASE WHEN agreement_accepted_at IS NOT NULL THEN 1 END) AS accepted_agreements
            FROM group_members
            WHERE group_id = :group_id
              AND status != 'removed_before_start'
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    latest_cycle = db.execute(
        text(
            """
            SELECT *
            FROM cycles
            WHERE group_id = :group_id
            ORDER BY cycle_number DESC
            LIMIT 1
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    contribution_stats = {
        "total": 0,
        "pending": 0,
        "paid": 0,
        "confirmed": 0,
        "group_verified": 0,
        "disputed": 0,
    }

    if latest_cycle:
        rows = db.execute(
            text(
                """
                SELECT status, COUNT(id) AS count
                FROM contributions
                WHERE cycle_id = :cycle_id
                GROUP BY status
                """
            ),
            {"cycle_id": latest_cycle["id"]},
        ).mappings().all()

        for row in rows:
            contribution_stats[row["status"]] = int(row["count"] or 0)
            contribution_stats["total"] += int(row["count"] or 0)

    total = contribution_stats["total"]
    confirmed = contribution_stats["confirmed"] + contribution_stats["group_verified"]
    paid = contribution_stats["paid"]
    pending = contribution_stats["pending"]
    disputed = contribution_stats["disputed"]

    score = 100
    score -= int(member_stats["pending_agreements"] or 0) * 8
    score -= pending * 5
    score -= paid * 3
    score -= disputed * 15

    if total > 0:
        score += round((confirmed / total) * 8)

    score = max(0, min(100, score))

    if score >= 85:
        label = "Strong"
        tone = "success"
    elif score >= 70:
        label = "Healthy"
        tone = "info"
    elif score >= 50:
        label = "Needs attention"
        tone = "warning"
    else:
        label = "At risk"
        tone = "danger"

    signals = []

    if int(member_stats["pending_agreements"] or 0) > 0:
        signals.append("Some members still need to accept the Circle Commitment.")

    if pending > 0:
        signals.append("Some contribution rows are still pending.")

    if paid > 0:
        signals.append("Some uploaded payment proofs are waiting for receiver confirmation.")

    if disputed > 0:
        signals.append("This group has disputed contribution rows.")

    if not signals:
        signals.append("No major group health issues detected.")

    return {
        "group_id": group_id,
        "group_name": group["name"],
        "score": score,
        "label": label,
        "tone": tone,
        "signals": signals,
        "members": dict(member_stats),
        "latest_cycle": dict(latest_cycle) if latest_cycle else None,
        "contributions": contribution_stats,
    }