import csv
import io
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import User

router = APIRouter()

DISPUTE_REASONS = {
    "payment_not_received",
    "wrong_amount",
    "wrong_receiver",
    "unclear_proof",
    "duplicate_proof",
    "other",
}

DISPUTE_STATUSES = {
    "open",
    "under_review",
    "resolved",
    "dismissed",
}

CONTRIBUTION_STATUSES = {
    "pending",
    "paid",
    "confirmed",
    "group_verified",
    "disputed",
}


class DisputeCaseCreate(BaseModel):
    reason: str = Field(min_length=2, max_length=80)
    note: str | None = Field(default=None, max_length=3000)
    evidence_text: str | None = Field(default=None, max_length=3000)


class DisputeCaseStatusUpdate(BaseModel):
    status: str
    resolution_note: str | None = Field(default=None, max_length=3000)
    contribution_status: str | None = None


def new_id() -> str:
    return str(uuid.uuid4())


def csv_response(filename: str, rows: list[dict[str, Any]], fieldnames: list[str]):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for row in rows:
        cleaned: dict[str, str] = {}

        for key in fieldnames:
            value = row.get(key)

            if isinstance(value, (dict, list)):
                cleaned[key] = json.dumps(value, default=str)
            elif isinstance(value, datetime):
                cleaned[key] = value.isoformat()
            elif value is None:
                cleaned[key] = ""
            else:
                cleaned[key] = str(value)

        writer.writerow(cleaned)

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


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
              AND COALESCE(status, '') != 'removed_before_start'
            """
        ),
        {
            "group_id": group_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    return member


def require_group_organizer(db: Session, group_id: str, user_id: str):
    member = require_group_member(db, group_id, user_id)

    if member.get("role") not in {"organizer", "co_organizer"}:
        raise HTTPException(status_code=403, detail="Only an organizer can update dispute status")

    return member


def best_effort_audit_log(
    db: Session,
    group_id: str,
    actor_user_id: str,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
):
    columns = table_columns(db, "audit_logs")

    if not columns:
        return

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

    column_sql = ", ".join(insert_columns)
    placeholders = ", ".join(f":{column}" for column in insert_columns)

    db.execute(
        text(
            f"""
            INSERT INTO audit_logs ({column_sql})
            VALUES ({placeholders})
            """
        ),
        values,
    )


def contribution_context(db: Session, contribution_id: str):
    row = db.execute(
        text(
            """
            SELECT
              c.id AS contribution_id,
              c.cycle_id,
              c.payer_user_id,
              c.receiver_user_id,
              c.amount,
              c.status,
              c.payment_reference,
              c.proof_url,
              c.note,
              cy.group_id,
              cy.cycle_number,
              g.name AS group_name,
              g.currency,
              payer.name AS payer_name,
              payer.email AS payer_email,
              receiver.name AS receiver_name,
              receiver.email AS receiver_email
            FROM contributions c
            JOIN cycles cy ON cy.id = c.cycle_id
            JOIN groups g ON g.id = cy.group_id
            JOIN users payer ON payer.id = c.payer_user_id
            JOIN users receiver ON receiver.id = c.receiver_user_id
            WHERE c.id = :contribution_id
            """
        ),
        {"contribution_id": contribution_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Contribution not found")

    return row


@router.get("/groups/{group_id}/export/ledger.csv")
def export_group_ledger_csv(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)

    group = db.execute(
        text(
            """
            SELECT id, name
            FROM groups
            WHERE id = :group_id
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    rows = db.execute(
        text(
            """
            SELECT
              g.name AS group_name,
              g.currency,
              cy.cycle_number,
              cy.status AS cycle_status,
              cy.due_date,
              c.id AS contribution_id,
              payer.name AS payer_name,
              payer.email AS payer_email,
              receiver.name AS receiver_name,
              receiver.email AS receiver_email,
              c.amount,
              c.status AS contribution_status,
              c.payment_reference,
              c.proof_url,
              c.note,
              c.created_at,
              c.updated_at
            FROM contributions c
            JOIN cycles cy ON cy.id = c.cycle_id
            JOIN groups g ON g.id = cy.group_id
            JOIN users payer ON payer.id = c.payer_user_id
            JOIN users receiver ON receiver.id = c.receiver_user_id
            WHERE g.id = :group_id
            ORDER BY cy.cycle_number ASC, payer.name ASC
            """
        ),
        {"group_id": group_id},
    ).mappings().all()

    fieldnames = [
        "group_name",
        "currency",
        "cycle_number",
        "cycle_status",
        "due_date",
        "contribution_id",
        "payer_name",
        "payer_email",
        "receiver_name",
        "receiver_email",
        "amount",
        "contribution_status",
        "payment_reference",
        "proof_url",
        "note",
        "created_at",
        "updated_at",
    ]

    filename = f"rota-ledger-{group['name'].replace(' ', '-').lower()}.csv"

    return csv_response(filename, [dict(row) for row in rows], fieldnames)


@router.get("/groups/{group_id}/export/audit.csv")
def export_group_audit_csv(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)

    group = db.execute(
        text(
            """
            SELECT id, name
            FROM groups
            WHERE id = :group_id
            """
        ),
        {"group_id": group_id},
    ).mappings().first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    columns = table_columns(db, "audit_logs")

    if not columns:
        return csv_response(
            f"rota-audit-{group['name'].replace(' ', '-').lower()}.csv",
            [],
            ["id", "created_at", "actor_name", "actor_email", "action", "entity_type", "entity_id", "metadata"],
        )

    select_parts: list[str] = []

    def add(column: str, alias: str | None = None):
        if column in columns:
            select_parts.append(f"a.{column} AS {alias or column}")

    add("id")
    add("created_at")
    add("action")
    add("entity_type")
    add("entity_id")
    add("metadata")
    add("details", "metadata")

    actor_join = ""
    actor_select = "'Unknown' AS actor_name, '' AS actor_email"

    if "actor_user_id" in columns:
        actor_join = "LEFT JOIN users actor ON actor.id = a.actor_user_id"
        actor_select = "COALESCE(actor.name, 'Unknown') AS actor_name, COALESCE(actor.email, '') AS actor_email"
    elif "user_id" in columns:
        actor_join = "LEFT JOIN users actor ON actor.id = a.user_id"
        actor_select = "COALESCE(actor.name, 'Unknown') AS actor_name, COALESCE(actor.email, '') AS actor_email"

    if not select_parts:
        select_parts = ["a.*"]

    select_sql = ", ".join(select_parts + [actor_select])

    rows = db.execute(
        text(
            f"""
            SELECT {select_sql}
            FROM audit_logs a
            {actor_join}
            WHERE a.group_id = :group_id
            ORDER BY a.created_at DESC
            """
        ),
        {"group_id": group_id},
    ).mappings().all()

    fieldnames = [
        "id",
        "created_at",
        "actor_name",
        "actor_email",
        "action",
        "entity_type",
        "entity_id",
        "metadata",
    ]

    filename = f"rota-audit-{group['name'].replace(' ', '-').lower()}.csv"

    return csv_response(filename, [dict(row) for row in rows], fieldnames)


@router.post("/contributions/{contribution_id}/dispute-case")
def create_dispute_case(
    contribution_id: str,
    payload: DisputeCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reason = payload.reason.strip().lower()

    if reason not in DISPUTE_REASONS:
        raise HTTPException(status_code=400, detail="Invalid dispute reason")

    contribution = contribution_context(db, contribution_id)
    require_group_member(db, contribution["group_id"], current_user.id)

    case_id = new_id()

    row = db.execute(
        text(
            """
            INSERT INTO dispute_cases (
              id,
              group_id,
              contribution_id,
              cycle_id,
              opened_by_user_id,
              reason,
              note,
              evidence_text,
              status,
              created_at,
              updated_at
            )
            VALUES (
              :id,
              :group_id,
              :contribution_id,
              :cycle_id,
              :opened_by_user_id,
              :reason,
              :note,
              :evidence_text,
              'open',
              NOW(),
              NOW()
            )
            ON CONFLICT (contribution_id)
            DO UPDATE SET
              reason = EXCLUDED.reason,
              note = EXCLUDED.note,
              evidence_text = EXCLUDED.evidence_text,
              status = 'open',
              updated_at = NOW()
            RETURNING *
            """
        ),
        {
            "id": case_id,
            "group_id": contribution["group_id"],
            "contribution_id": contribution_id,
            "cycle_id": contribution["cycle_id"],
            "opened_by_user_id": current_user.id,
            "reason": reason,
            "note": payload.note,
            "evidence_text": payload.evidence_text,
        },
    ).mappings().first()

    db.execute(
        text(
            """
            UPDATE contributions
            SET status = 'disputed',
                updated_at = NOW()
            WHERE id = :contribution_id
            """
        ),
        {"contribution_id": contribution_id},
    )

    best_effort_audit_log(
        db,
        group_id=contribution["group_id"],
        actor_user_id=current_user.id,
        action="structured_dispute_opened",
        entity_type="contribution",
        entity_id=contribution_id,
        metadata={
            "reason": reason,
            "case_id": row["id"],
        },
    )

    db.commit()

    return dict(row)


@router.get("/groups/{group_id}/dispute-cases")
def list_group_dispute_cases(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_group_member(db, group_id, current_user.id)

    rows = db.execute(
        text(
            """
            SELECT
              dc.*,
              cy.cycle_number,
              c.amount,
              c.status AS contribution_status,
              c.payment_reference,
              c.proof_url,
              payer.name AS payer_name,
              payer.email AS payer_email,
              receiver.name AS receiver_name,
              receiver.email AS receiver_email,
              opened_by.name AS opened_by_name,
              opened_by.email AS opened_by_email,
              resolved_by.name AS resolved_by_name,
              resolved_by.email AS resolved_by_email
            FROM dispute_cases dc
            JOIN contributions c ON c.id = dc.contribution_id
            LEFT JOIN cycles cy ON cy.id = dc.cycle_id
            JOIN users payer ON payer.id = c.payer_user_id
            JOIN users receiver ON receiver.id = c.receiver_user_id
            JOIN users opened_by ON opened_by.id = dc.opened_by_user_id
            LEFT JOIN users resolved_by ON resolved_by.id = dc.resolved_by_user_id
            WHERE dc.group_id = :group_id
            ORDER BY
              CASE dc.status
                WHEN 'open' THEN 1
                WHEN 'under_review' THEN 2
                WHEN 'resolved' THEN 3
                WHEN 'dismissed' THEN 4
                ELSE 5
              END,
              dc.created_at DESC
            """
        ),
        {"group_id": group_id},
    ).mappings().all()

    return {"cases": [dict(row) for row in rows]}


@router.post("/dispute-cases/{case_id}/status")
def update_dispute_case_status(
    case_id: str,
    payload: DisputeCaseStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status = payload.status.strip().lower()

    if status not in DISPUTE_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid dispute status")

    if payload.contribution_status and payload.contribution_status not in CONTRIBUTION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid contribution status")

    dispute_case = db.execute(
        text(
            """
            SELECT *
            FROM dispute_cases
            WHERE id = :case_id
            """
        ),
        {"case_id": case_id},
    ).mappings().first()

    if not dispute_case:
        raise HTTPException(status_code=404, detail="Dispute case not found")

    require_group_organizer(db, dispute_case["group_id"], current_user.id)

    resolved_at = datetime.now(timezone.utc) if status in {"resolved", "dismissed"} else None
    resolved_by = current_user.id if status in {"resolved", "dismissed"} else None

    row = db.execute(
        text(
            """
            UPDATE dispute_cases
            SET status = :status,
                resolution_note = :resolution_note,
                resolved_by_user_id = :resolved_by_user_id,
                resolved_at = :resolved_at,
                updated_at = NOW()
            WHERE id = :case_id
            RETURNING *
            """
        ),
        {
            "case_id": case_id,
            "status": status,
            "resolution_note": payload.resolution_note,
            "resolved_by_user_id": resolved_by,
            "resolved_at": resolved_at,
        },
    ).mappings().first()

    if payload.contribution_status:
        db.execute(
            text(
                """
                UPDATE contributions
                SET status = :status,
                    updated_at = NOW()
                WHERE id = :contribution_id
                """
            ),
            {
                "status": payload.contribution_status,
                "contribution_id": dispute_case["contribution_id"],
            },
        )

    best_effort_audit_log(
        db,
        group_id=dispute_case["group_id"],
        actor_user_id=current_user.id,
        action=f"structured_dispute_{status}",
        entity_type="dispute_case",
        entity_id=case_id,
        metadata={
            "case_id": case_id,
            "contribution_id": dispute_case["contribution_id"],
            "status": status,
            "contribution_status": payload.contribution_status,
        },
    )

    db.commit()

    return dict(row)