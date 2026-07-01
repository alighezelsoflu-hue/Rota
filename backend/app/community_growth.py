from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import User

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


@router.get("/public/groups/{invite_code}")
def public_group_invite(invite_code: str, db: Session = Depends(get_db)):
    group = db.execute(
        text(
            """
            SELECT
              g.id,
              g.name,
              g.invite_code,
              g.contribution_amount,
              g.currency,
              g.frequency,
              g.member_limit,
              g.payout_method,
              g.status,
              g.created_at,
              organizer_user.name AS organizer_name
            FROM groups g
            LEFT JOIN group_members organizer_member
              ON organizer_member.group_id = g.id
             AND organizer_member.role = 'organizer'
            LEFT JOIN users organizer_user
              ON organizer_user.id = organizer_member.user_id
            WHERE UPPER(g.invite_code) = UPPER(:invite_code)
              AND COALESCE(g.status, '') != 'archived'
            LIMIT 1
            """
        ),
        {"invite_code": invite_code},
    ).mappings().first()

    if not group:
        raise HTTPException(status_code=404, detail="Invite not found")

    member_count = db.execute(
        text(
            """
            SELECT COUNT(*) AS count
            FROM group_members
            WHERE group_id = :group_id
              AND COALESCE(status, 'active') != 'removed_before_start'
            """
        ),
        {"group_id": group["id"]},
    ).mappings().first()

    discovery = None

    if table_exists(db, "group_discovery_settings"):
        discovery = db.execute(
            text(
                """
                SELECT
                  is_discoverable,
                  looking_for_members,
                  city,
                  country,
                  open_slots,
                  min_trust_score,
                  message
                FROM group_discovery_settings
                WHERE group_id = :group_id
                """
            ),
            {"group_id": group["id"]},
        ).mappings().first()

    open_slots = max(int(group["member_limit"] or 0) - int(member_count["count"] or 0), 0)

    return {
        "group": dict(group),
        "member_count": int(member_count["count"] or 0),
        "open_slots": open_slots,
        "organizer_name": group["organizer_name"] or "Organizer",
        "discovery": dict(discovery) if discovery else None,
        "principles": {
            "rota_holds_money": False,
            "interest_free": True,
            "coordination_only": True,
        },
    }


@router.get("/groups/{group_id}/review-prompts")
def group_review_prompts(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)

    if not table_exists(db, "member_reviews"):
        return {
            "should_prompt": False,
            "completed_cycle_count": 0,
            "pending_members": [],
        }

    completed_cycles = db.execute(
        text(
            """
            WITH cycle_totals AS (
              SELECT
                cy.id,
                COUNT(c.id) AS contribution_count,
                SUM(
                  CASE
                    WHEN c.status IN ('confirmed', 'group_verified') THEN 1
                    ELSE 0
                  END
                ) AS confirmed_count
              FROM cycles cy
              LEFT JOIN contributions c ON c.cycle_id = cy.id
              WHERE cy.group_id = :group_id
              GROUP BY cy.id
            )
            SELECT COUNT(*) AS count
            FROM cycle_totals
            WHERE contribution_count > 0
              AND confirmed_count = contribution_count
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    completed_count = int(completed_cycles["count"] or 0)

    if completed_count <= 0:
        return {
            "should_prompt": False,
            "completed_cycle_count": 0,
            "pending_members": [],
        }

    pending_members = db.execute(
        text(
            """
            SELECT
              u.id AS user_id,
              u.name,
              u.email,
              COALESCE(u.trust_score, 0) AS trust_score,
              gm.role
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = :group_id
              AND gm.user_id != :current_user_id
              AND COALESCE(gm.status, 'active') != 'removed_before_start'
              AND NOT EXISTS (
                SELECT 1
                FROM member_reviews mr
                WHERE mr.group_id = :group_id
                  AND mr.reviewer_user_id = :current_user_id
                  AND mr.reviewed_user_id = gm.user_id
              )
            ORDER BY gm.role DESC, u.name ASC
            """
        ),
        {
            "group_id": group_id,
            "current_user_id": current_user.id,
        },
    ).mappings().all()

    return {
        "should_prompt": len(pending_members) > 0,
        "completed_cycle_count": completed_count,
        "pending_members": [dict(row) for row in pending_members],
    }