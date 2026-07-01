import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import Group, GroupMember, User

router = APIRouter()

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


def require_thread_member(db: Session, thread_id: str, user_id: str):
    member = db.execute(
        text(
            """
            SELECT *
            FROM chat_thread_members
            WHERE thread_id = :thread_id
              AND user_id = :user_id
            """
        ),
        {"thread_id": thread_id, "user_id": user_id},
    ).mappings().first()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this chat thread")

    return member


def mark_thread_read_for_user(db: Session, thread_id: str, user_id: str):
    require_thread_member(db, thread_id, user_id)

    db.execute(
        text(
            """
            UPDATE chat_thread_members
            SET last_read_at = NOW()
            WHERE thread_id = :thread_id
              AND user_id = :user_id
            """
        ),
        {"thread_id": thread_id, "user_id": user_id},
    )

    if not table_exists(db, "notifications"):
        return

    notification_columns = table_columns(db, "notifications")

    if "read_at" not in notification_columns or "user_id" not in notification_columns:
        return

    set_parts = ["read_at = NOW()"]

    if "updated_at" in notification_columns:
        set_parts.append("updated_at = NOW()")

    related_conditions = []

    params = {
        "user_id": user_id,
        "thread_id": thread_id,
        "messages_url": "/messages",
        "thread_url": f"/messages?thread={thread_id}",
    }

    if "related_thread_id" in notification_columns:
        related_conditions.append("related_thread_id = :thread_id")

    if "related_url" in notification_columns:
        related_conditions.append(
            """
            related_url = :messages_url
            OR related_url = :thread_url
            OR related_url LIKE '/messages%'
            """
        )

    if "type" in notification_columns:
        related_conditions.append(
            """
            type IN (
              'group_message',
              'direct_message',
              'chat_message',
              'message',
              'group_messages'
            )
            """
        )

    if not related_conditions:
        return

    db.execute(
        text(
            f"""
            UPDATE notifications
            SET {", ".join(set_parts)}
            WHERE user_id = :user_id
              AND read_at IS NULL
              AND (
                {" OR ".join(f"({condition})" for condition in related_conditions)}
              )
            """
        ),
        params,
    )

class ChatMessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageReportIn(BaseModel):
    reason: str = Field(min_length=2, max_length=1000)


def new_id() -> str:
    return str(uuid.uuid4())


def direct_key_for(user_a: str, user_b: str) -> str:
    first, second = sorted([user_a, user_b])
    return f"{first}:{second}"


def require_group_member(db: Session, group_id: str, user_id: str) -> GroupMember:
    member = db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
            GroupMember.status != "removed_before_start",
        )
    )

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group.")

    return member


def require_thread_member(db: Session, thread_id: str, user_id: str):
    member = db.execute(
        text(
            """
            SELECT *
            FROM chat_thread_members
            WHERE thread_id = :thread_id
              AND user_id = :user_id
            """
        ),
        {"thread_id": thread_id, "user_id": user_id},
    ).mappings().first()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this chat.")

    return member


def users_have_accepted_connection(db: Session, user_a: str, user_b: str) -> bool:
    row = db.execute(
        text(
            """
            SELECT id
            FROM connection_requests
            WHERE status = 'accepted'
              AND (
                (requester_user_id = :user_a AND receiver_user_id = :user_b)
                OR
                (requester_user_id = :user_b AND receiver_user_id = :user_a)
              )
            LIMIT 1
            """
        ),
        {"user_a": user_a, "user_b": user_b},
    ).first()

    return bool(row)


def create_or_get_group_thread(db: Session, group_id: str) -> str:
    existing = db.execute(
        text(
            """
            SELECT id
            FROM chat_threads
            WHERE type = 'group'
              AND group_id = :group_id
            LIMIT 1
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    if existing:
        thread_id = existing["id"]
    else:
        thread_id = new_id()
        db.execute(
            text(
                """
                INSERT INTO chat_threads (
                  id,
                  type,
                  group_id,
                  created_at,
                  updated_at
                )
                VALUES (
                  :id,
                  'group',
                  :group_id,
                  NOW(),
                  NOW()
                )
                ON CONFLICT DO NOTHING
                """
            ),
            {"id": thread_id, "group_id": group_id},
        )

        existing_after_conflict = db.execute(
            text(
                """
                SELECT id
                FROM chat_threads
                WHERE type = 'group'
                  AND group_id = :group_id
                LIMIT 1
                """
            ),
            {"group_id": group_id},
        ).mappings().first()

        if existing_after_conflict:
            thread_id = existing_after_conflict["id"]

    db.execute(
        text(
            """
            INSERT INTO chat_thread_members (
              thread_id,
              user_id,
              created_at
            )
            SELECT
              :thread_id,
              gm.user_id,
              NOW()
            FROM group_members gm
            WHERE gm.group_id = :group_id
              AND gm.status != 'removed_before_start'
            ON CONFLICT DO NOTHING
            """
        ),
        {"thread_id": thread_id, "group_id": group_id},
    )

    db.commit()

    return thread_id


def create_or_get_direct_thread(db: Session, current_user_id: str, other_user_id: str) -> str:
    key = direct_key_for(current_user_id, other_user_id)

    existing = db.execute(
        text(
            """
            SELECT id
            FROM chat_threads
            WHERE type = 'direct'
              AND direct_key = :direct_key
            LIMIT 1
            """
        ),
        {"direct_key": key},
    ).mappings().first()

    if existing:
        return existing["id"]

    thread_id = new_id()

    db.execute(
        text(
            """
            INSERT INTO chat_threads (
              id,
              type,
              direct_key,
              created_at,
              updated_at
            )
            VALUES (
              :id,
              'direct',
              :direct_key,
              NOW(),
              NOW()
            )
            ON CONFLICT DO NOTHING
            """
        ),
        {"id": thread_id, "direct_key": key},
    )

    existing_after_conflict = db.execute(
        text(
            """
            SELECT id
            FROM chat_threads
            WHERE type = 'direct'
              AND direct_key = :direct_key
            LIMIT 1
            """
        ),
        {"direct_key": key},
    ).mappings().first()

    if existing_after_conflict:
        thread_id = existing_after_conflict["id"]

    db.execute(
        text(
            """
            INSERT INTO chat_thread_members (
              thread_id,
              user_id,
              created_at
            )
            VALUES
              (:thread_id, :user_a, NOW()),
              (:thread_id, :user_b, NOW())
            ON CONFLICT DO NOTHING
            """
        ),
        {
            "thread_id": thread_id,
            "user_a": current_user_id,
            "user_b": other_user_id,
        },
    )

    db.commit()

    return thread_id


@router.get("/chat/threads")
def list_chat_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT
              t.id,
              t.type,
              t.group_id,
              t.updated_at,
              g.name AS group_name,
              COALESCE(
                g.name,
                NULLIF(STRING_AGG(other_user.name, ', '), '')
              ) AS label,
              last_message.body AS last_message,
              last_message.created_at AS last_message_at
            FROM chat_thread_members me
            JOIN chat_threads t ON t.id = me.thread_id
            LEFT JOIN groups g ON g.id = t.group_id
            LEFT JOIN chat_thread_members other_member
              ON other_member.thread_id = t.id
              AND other_member.user_id != :current_user_id
            LEFT JOIN users other_user ON other_user.id = other_member.user_id
            LEFT JOIN LATERAL (
              SELECT body, created_at
              FROM chat_messages
              WHERE thread_id = t.id
                AND deleted_at IS NULL
              ORDER BY created_at DESC
              LIMIT 1
            ) AS last_message ON TRUE
            WHERE me.user_id = :current_user_id
            GROUP BY
              t.id,
              t.type,
              t.group_id,
              t.updated_at,
              g.name,
              last_message.body,
              last_message.created_at
            ORDER BY COALESCE(last_message.created_at, t.updated_at) DESC
            """
        ),
        {"current_user_id": current_user.id},
    ).mappings().all()

    return [dict(row) for row in rows]


@router.post("/groups/{group_id}/chat-thread")
def open_group_chat_thread(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)

    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    if getattr(group, "archived_at", None):
        raise HTTPException(status_code=400, detail="Archived groups cannot start new chat activity.")

    require_group_member(db, group_id, current_user.id)

    thread_id = create_or_get_group_thread(db, group_id)

    return {
        "id": thread_id,
        "type": "group",
        "group_id": group_id,
        "label": group.name,
    }


@router.post("/chat/direct/{other_user_id}")
def open_direct_chat_thread(
    other_user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if other_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot message yourself.")

    other_user = db.get(User, other_user_id)

    if not other_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not users_have_accepted_connection(db, current_user.id, other_user_id):
        raise HTTPException(
            status_code=403,
            detail="Private chat is only available after an accepted connection request.",
        )

    thread_id = create_or_get_direct_thread(db, current_user.id, other_user_id)

    return {
        "id": thread_id,
        "type": "direct",
        "group_id": None,
        "label": other_user.name,
    }


@router.get("/chat/threads/{thread_id}/messages")
def list_chat_messages(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_thread_member(db, thread_id, current_user.id)

    db.execute(
        text(
            """
            UPDATE chat_thread_members
            SET last_read_at = NOW()
            WHERE thread_id = :thread_id
              AND user_id = :user_id
            """
        ),
        {"thread_id": thread_id, "user_id": current_user.id},
    )

    rows = db.execute(
        text(
            """
            SELECT
              m.id,
              m.thread_id,
              m.sender_user_id,
              u.name AS sender_name,
              m.body,
              m.created_at,
              m.edited_at,
              m.deleted_at,
              CASE WHEN m.sender_user_id = :current_user_id THEN TRUE ELSE FALSE END AS mine
            FROM chat_messages m
            JOIN users u ON u.id = m.sender_user_id
            WHERE m.thread_id = :thread_id
              AND m.deleted_at IS NULL
            ORDER BY m.created_at ASC
            LIMIT 200
            """
        ),
        {
            "thread_id": thread_id,
            "current_user_id": current_user.id,
        },
    ).mappings().all()

    db.commit()
    mark_thread_read_for_user(db, thread_id, current_user.id)
    db.commit()
    return [dict(row) for row in rows]


@router.post("/chat/threads/{thread_id}/read")
def mark_chat_thread_read(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mark_thread_read_for_user(db, thread_id, current_user.id)
    db.commit()

    return {"read": True}

def send_chat_message(
    thread_id: str,
    payload: ChatMessageIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_thread_member(db, thread_id, current_user.id)

    clean_body = payload.body.strip()

    if not clean_body:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    message_id = new_id()

    db.execute(
        text(
            """
            INSERT INTO chat_messages (
              id,
              thread_id,
              sender_user_id,
              body,
              created_at
            )
            VALUES (
              :id,
              :thread_id,
              :sender_user_id,
              :body,
              NOW()
            )
            """
        ),
        {
            "id": message_id,
            "thread_id": thread_id,
            "sender_user_id": current_user.id,
            "body": clean_body,
        },
    )

    db.execute(
        text(
            """
            UPDATE chat_threads
            SET updated_at = NOW()
            WHERE id = :thread_id
            """
        ),
        {"thread_id": thread_id},
    )

    db.commit()

    return {
        "id": message_id,
        "thread_id": thread_id,
        "sender_user_id": current_user.id,
        "sender_name": current_user.name,
        "body": clean_body,
        "mine": True,
    }


@router.post("/chat/messages/{message_id}/report")
def report_chat_message(
    message_id: str,
    payload: MessageReportIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = db.execute(
        text(
            """
            SELECT *
            FROM chat_messages
            WHERE id = :message_id
              AND deleted_at IS NULL
            """
        ),
        {"message_id": message_id},
    ).mappings().first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found.")

    require_thread_member(db, message["thread_id"], current_user.id)

    if message["sender_user_id"] == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot report your own message.")

    try:
        db.execute(
            text(
                """
                INSERT INTO message_reports (
                  id,
                  message_id,
                  reporter_user_id,
                  reason,
                  created_at
                )
                VALUES (
                  :id,
                  :message_id,
                  :reporter_user_id,
                  :reason,
                  NOW()
                )
                """
            ),
            {
                "id": new_id(),
                "message_id": message_id,
                "reporter_user_id": current_user.id,
                "reason": payload.reason.strip(),
            },
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="You already reported this message.") from exc

    return {"ok": True, "message": "Message reported."}