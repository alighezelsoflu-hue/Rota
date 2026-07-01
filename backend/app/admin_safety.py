from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import User

router = APIRouter(prefix="/admin/safety", tags=["admin safety"])


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


def column_exists(db: Session, table_name: str, column_name: str) -> bool:
    row = db.execute(
        text(
            """
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = :table_name
                AND column_name = :column_name
            ) AS exists
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    ).mappings().first()

    return bool(row and row["exists"])


def scalar(db: Session, sql: str, params: dict | None = None, default: int = 0) -> int:
    try:
        row = db.execute(text(sql), params or {}).mappings().first()
        if not row:
            return default
        return int(next(iter(row.values())) or default)
    except Exception:
        return default


def require_admin(db: Session, user_id: str):
    if not column_exists(db, "users", "is_admin"):
        raise HTTPException(status_code=403, detail="Admin access is not configured")

    row = db.execute(
        text(
            """
            SELECT is_admin
            FROM users
            WHERE id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().first()

    if not row or not row["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/overview")
def admin_safety_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(db, current_user.id)

    total_users = scalar(db, "SELECT COUNT(*) AS count FROM users")
    total_groups = scalar(db, "SELECT COUNT(*) AS count FROM groups")
    active_groups = scalar(
        db,
        """
        SELECT COUNT(*) AS count
        FROM groups
        WHERE COALESCE(status, '') NOT IN ('archived', 'closed')
        """,
    )

    open_disputes = 0
    resolved_disputes = 0
    high_dispute_groups = []

    if table_exists(db, "dispute_cases"):
        open_disputes = scalar(
            db,
            """
            SELECT COUNT(*) AS count
            FROM dispute_cases
            WHERE status IN ('open', 'under_review')
            """,
        )

        resolved_disputes = scalar(
            db,
            """
            SELECT COUNT(*) AS count
            FROM dispute_cases
            WHERE status IN ('resolved', 'dismissed')
            """,
        )

        high_dispute_groups = db.execute(
            text(
                """
                SELECT
                  g.id AS group_id,
                  g.name AS group_name,
                  COUNT(dc.id) AS total_disputes,
                  SUM(
                    CASE
                      WHEN dc.status IN ('open', 'under_review') THEN 1
                      ELSE 0
                    END
                  ) AS open_disputes
                FROM dispute_cases dc
                JOIN groups g ON g.id = dc.group_id
                GROUP BY g.id, g.name
                HAVING COUNT(dc.id) > 0
                ORDER BY open_disputes DESC, total_disputes DESC, g.name ASC
                LIMIT 10
                """
            )
        ).mappings().all()

    message_reports = 0
    recent_message_reports = []

    if table_exists(db, "message_reports"):
        message_reports = scalar(db, "SELECT COUNT(*) AS count FROM message_reports")

        if table_exists(db, "chat_messages"):
            recent_message_reports = db.execute(
                text(
                    """
                    SELECT
                      mr.id,
                      mr.reason,
                      mr.created_at,
                      reporter.name AS reporter_name,
                      sender.name AS sender_name,
                      cm.body AS message_body
                    FROM message_reports mr
                    JOIN users reporter ON reporter.id = mr.reporter_user_id
                    JOIN chat_messages cm ON cm.id = mr.message_id
                    JOIN users sender ON sender.id = cm.sender_user_id
                    ORDER BY mr.created_at DESC
                    LIMIT 10
                    """
                )
            ).mappings().all()

    pending_join_requests = 0

    if table_exists(db, "group_join_requests"):
        pending_join_requests = scalar(
            db,
            """
            SELECT COUNT(*) AS count
            FROM group_join_requests
            WHERE status = 'pending'
            """,
        )

    pending_connection_requests = 0

    if table_exists(db, "connection_requests"):
        pending_connection_requests = scalar(
            db,
            """
            SELECT COUNT(*) AS count
            FROM connection_requests
            WHERE status = 'pending'
            """,
        )

    recent_signups = []

    if column_exists(db, "users", "created_at"):
        recent_signups = db.execute(
            text(
                """
                SELECT
                  id,
                  name,
                  email,
                  COALESCE(trust_score, 0) AS trust_score,
                  verification_status,
                  created_at
                FROM users
                ORDER BY created_at DESC
                LIMIT 12
                """
            )
        ).mappings().all()
    else:
        recent_signups = db.execute(
            text(
                """
                SELECT
                  id,
                  name,
                  email,
                  COALESCE(trust_score, 0) AS trust_score,
                  verification_status
                FROM users
                ORDER BY name ASC
                LIMIT 12
                """
            )
        ).mappings().all()

    return {
        "summary": {
            "total_users": total_users,
            "total_groups": total_groups,
            "active_groups": active_groups,
            "open_disputes": open_disputes,
            "resolved_disputes": resolved_disputes,
            "message_reports": message_reports,
            "pending_join_requests": pending_join_requests,
            "pending_connection_requests": pending_connection_requests,
        },
        "high_dispute_groups": [dict(row) for row in high_dispute_groups],
        "recent_message_reports": [dict(row) for row in recent_message_reports],
        "recent_signups": [dict(row) for row in recent_signups],
    }