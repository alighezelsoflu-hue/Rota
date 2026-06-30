from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import (
    Contribution,
    ContributionMemberConfirmation,
    Cycle,
    Group,
    GroupContinuationVote,
    GroupMember,
    User,
)

router = APIRouter()


DEFAULT_AGREEMENT_TEXT = """Circle Commitment

By joining this circle, I agree that:

1. Rota does not hold, move, lend, or guarantee money.
2. Members pay the selected receiver directly outside Rota.
3. I will contribute the agreed amount every cycle.
4. I will remain in the circle after the first cycle starts.
5. A group can stop after a cycle only if all active members vote not to continue.
6. Only the organizer can close/archive the group after unanimous member confirmation.
7. Receipts, confirmations, disputes, and audit logs are visible to group members.
8. This is a community coordination agreement, not a bank account, loan, deposit, or payment service.
"""


class VoteIn(BaseModel):
    decision: Literal["continue", "stop"]
    note: str | None = Field(default=None, max_length=1000)


class ReviewIn(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def get_group(db: Session, group_id: str) -> Group:
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


def get_member(db: Session, group_id: str, user_id: str) -> GroupMember:
    member = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    return member


def is_organizer(member: GroupMember) -> bool:
    return member.role in {"organizer", "co_organizer"}


def active_members(db: Session, group_id: str) -> list[GroupMember]:
    return (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == group_id,
            GroupMember.status.in_(["active", "completed"]),
        )
        .order_by(GroupMember.position.asc())
        .all()
    )


def latest_cycle(db: Session, group_id: str) -> Cycle | None:
    return (
        db.query(Cycle)
        .filter(Cycle.group_id == group_id)
        .order_by(Cycle.cycle_number.desc())
        .first()
    )


def cycle_is_complete(db: Session, cycle_id: str) -> bool:
    rows = db.query(Contribution).filter(Contribution.cycle_id == cycle_id).all()
    if not rows:
        return False

    completed_statuses = {"confirmed", "group_verified"}
    return all(row.status in completed_statuses for row in rows)


def received_member_ids(db: Session, group_id: str) -> set[str]:
    cycles = db.query(Cycle).filter(Cycle.group_id == group_id).all()
    return {
        cycle.receiver_user_id
        for cycle in cycles
        if getattr(cycle, "receiver_user_id", None)
    }


def vote_rows(db: Session, group_id: str, cycle_id: str | None) -> list[GroupContinuationVote]:
    if not cycle_id:
        return []

    return (
        db.query(GroupContinuationVote)
        .filter(
            GroupContinuationVote.group_id == group_id,
            GroupContinuationVote.cycle_id == cycle_id,
        )
        .all()
    )


def serialize_vote(vote: GroupContinuationVote) -> dict:
    return {
        "id": vote.id,
        "group_id": vote.group_id,
        "cycle_id": vote.cycle_id,
        "voter_user_id": vote.voter_user_id,
        "decision": vote.decision,
        "note": vote.note,
        "created_at": vote.created_at.isoformat() if vote.created_at else None,
        "updated_at": vote.updated_at.isoformat() if vote.updated_at else None,
    }


@router.get("/groups/{group_id}/governance")
def group_governance(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = get_group(db, group_id)
    member = get_member(db, group_id, current_user.id)

    members = active_members(db, group_id)
    member_ids = {m.user_id for m in members}

    cycle = latest_cycle(db, group_id)
    review_cycle_id = group.continuation_vote_cycle_id or (cycle.id if cycle else None)
    votes = vote_rows(db, group_id, review_cycle_id)
    my_vote = next((vote for vote in votes if vote.voter_user_id == current_user.id), None)

    stop_votes = [vote for vote in votes if vote.decision == "stop"]
    continue_votes = [vote for vote in votes if vote.decision == "continue"]

    all_voted = len(votes) >= len(members) and len(members) > 0
    all_stop = all_voted and len(stop_votes) == len(members)

    received_ids = received_member_ids(db, group_id)
    rotation_received_count = len(received_ids.intersection(member_ids))
    rotation_complete = len(member_ids) > 0 and rotation_received_count >= len(member_ids)

    current_cycle_complete = cycle_is_complete(db, cycle.id) if cycle else False

    can_open_vote = (
        is_organizer(member)
        and bool(cycle)
        and current_cycle_complete
        and group.status not in {"cycle_review", "completed", "archived"}
    )

    can_close = (
        is_organizer(member)
        and group.status == "cycle_review"
        and all_stop
    )

    can_archive = (
        is_organizer(member)
        and group.status in {"completed", "cancelled"}
        and group.archived_at is None
    )

    return {
        "group_id": group.id,
        "status": group.status,
        "agreement_required": bool(group.agreement_required),
        "agreement_text": group.agreement_text or DEFAULT_AGREEMENT_TEXT,
        "agreement_version": group.agreement_version or 1,
        "agreement_accepted": bool(member.agreement_accepted_at),
        "member_status": member.status,
        "locked_at": group.locked_at.isoformat() if group.locked_at else None,
        "completed_at": group.completed_at.isoformat() if group.completed_at else None,
        "archived_at": group.archived_at.isoformat() if group.archived_at else None,
        "active_member_count": len(members),
        "rotation_received_count": rotation_received_count,
        "rotation_complete": rotation_complete,
        "latest_cycle_id": cycle.id if cycle else None,
        "latest_cycle_number": cycle.cycle_number if cycle else None,
        "latest_cycle_complete": current_cycle_complete,
        "continuation_vote_cycle_id": review_cycle_id,
        "continuation_vote_opened_at": (
            group.continuation_vote_opened_at.isoformat()
            if group.continuation_vote_opened_at
            else None
        ),
        "votes": [serialize_vote(vote) for vote in votes],
        "my_vote": serialize_vote(my_vote) if my_vote else None,
        "vote_summary": {
            "total_members": len(members),
            "votes_received": len(votes),
            "stop_votes": len(stop_votes),
            "continue_votes": len(continue_votes),
            "all_voted": all_voted,
            "all_stop": all_stop,
        },
        "permissions": {
            "is_organizer": is_organizer(member),
            "can_open_continuation_vote": can_open_vote,
            "can_close_group": can_close,
            "can_archive_group": can_archive,
        },
    }


@router.post("/groups/{group_id}/agreement/accept")
def accept_group_agreement(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = get_group(db, group_id)
    member = get_member(db, group_id, current_user.id)

    if group.status in {"completed", "archived"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This group is closed.",
        )

    member.status = "active"
    member.agreement_accepted_at = now_utc()
    member.agreement_version = group.agreement_version or 1

    db.commit()

    return {"ok": True, "message": "Agreement accepted."}


@router.post("/groups/{group_id}/leave")
def leave_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = get_group(db, group_id)
    member = get_member(db, group_id, current_user.id)

    existing_cycles = db.query(Cycle).filter(Cycle.group_id == group_id).count()

    if group.status in {"active_locked", "cycle_review"} or existing_cycles > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This group is locked until the rotation is completed or all active members agree to stop.",
        )

    if is_organizer(member):
        other_active_members = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id != current_user.id,
                GroupMember.status == "active",
            )
            .count()
        )

        if other_active_members > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organizer cannot leave while active members remain in the forming group.",
            )

    member.status = "removed_before_start"
    db.commit()

    return {"ok": True, "message": "You left the group before it started."}


@router.post("/groups/{group_id}/continuation-vote/open")
def open_continuation_vote(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = get_group(db, group_id)
    member = get_member(db, group_id, current_user.id)

    if not is_organizer(member):
        raise HTTPException(status_code=403, detail="Only the organizer can open a continuation vote.")

    if group.status in {"completed", "archived"}:
        raise HTTPException(status_code=400, detail="This group is already closed.")

    cycle = latest_cycle(db, group_id)
    if not cycle:
        raise HTTPException(status_code=400, detail="There is no cycle to review.")

    if not cycle_is_complete(db, cycle.id):
        raise HTTPException(
            status_code=400,
            detail="The current cycle must be fully confirmed before opening a continuation vote.",
        )

    group.status = "cycle_review"
    group.continuation_vote_cycle_id = cycle.id
    group.continuation_vote_opened_at = now_utc()

    db.commit()

    return {"ok": True, "message": "Continuation vote opened."}


@router.post("/groups/{group_id}/continuation-vote")
def cast_continuation_vote(
    group_id: str,
    payload: VoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = get_group(db, group_id)
    member = get_member(db, group_id, current_user.id)

    if member.status != "active":
        raise HTTPException(status_code=400, detail="Only active members can vote.")

    if group.status != "cycle_review":
        raise HTTPException(status_code=400, detail="There is no open continuation vote.")

    if not group.continuation_vote_cycle_id:
        raise HTTPException(status_code=400, detail="Continuation vote has no cycle.")

    vote = (
        db.query(GroupContinuationVote)
        .filter(
            GroupContinuationVote.group_id == group_id,
            GroupContinuationVote.cycle_id == group.continuation_vote_cycle_id,
            GroupContinuationVote.voter_user_id == current_user.id,
        )
        .first()
    )

    if not vote:
        vote = GroupContinuationVote(
            group_id=group_id,
            cycle_id=group.continuation_vote_cycle_id,
            voter_user_id=current_user.id,
            decision=payload.decision,
            note=payload.note,
        )
        db.add(vote)
    else:
        vote.decision = payload.decision
        vote.note = payload.note
        vote.updated_at = now_utc()

    db.commit()

    return {"ok": True, "message": "Vote saved."}


@router.post("/groups/{group_id}/close")
def close_group_after_unanimous_stop(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = get_group(db, group_id)
    member = get_member(db, group_id, current_user.id)

    if not is_organizer(member):
        raise HTTPException(status_code=403, detail="Only the organizer can close the group.")

    if group.status != "cycle_review":
        raise HTTPException(status_code=400, detail="Group must be in cycle review before closing.")

    members = active_members(db, group_id)
    votes = vote_rows(db, group_id, group.continuation_vote_cycle_id)

    if len(votes) < len(members):
        raise HTTPException(status_code=400, detail="All active members must vote before the group can close.")

    if any(vote.decision != "stop" for vote in votes):
        raise HTTPException(status_code=400, detail="The group cannot close because at least one member voted to continue.")

    group.status = "completed"
    group.completed_at = now_utc()

    for member_row in members:
        member_row.status = "completed"

    db.commit()

    return {"ok": True, "message": "Group closed after unanimous stop vote."}


@router.post("/groups/{group_id}/archive")
def archive_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = get_group(db, group_id)
    member = get_member(db, group_id, current_user.id)

    if not is_organizer(member):
        raise HTTPException(status_code=403, detail="Only the organizer can archive the group.")

    if group.status not in {"completed", "cancelled"}:
        raise HTTPException(status_code=400, detail="Group can only be archived after it is completed or cancelled.")

    group.status = "archived"
    group.archived_at = now_utc()

    db.commit()

    return {"ok": True, "message": "Group archived."}


def contribution_group_id(db: Session, contribution: Contribution) -> str:
    cycle = db.get(Cycle, contribution.cycle_id)
    if not cycle:
        raise HTTPException(status_code=404, detail="Contribution cycle not found")
    return cycle.group_id


def upsert_member_receipt_review(
    contribution_id: str,
    reviewer_user_id: str,
    decision: Literal["confirm", "dispute"],
    note: str | None,
    db: Session,
):
    review = (
        db.query(ContributionMemberConfirmation)
        .filter(
            ContributionMemberConfirmation.contribution_id == contribution_id,
            ContributionMemberConfirmation.reviewer_user_id == reviewer_user_id,
        )
        .first()
    )

    if not review:
        review = ContributionMemberConfirmation(
            contribution_id=contribution_id,
            reviewer_user_id=reviewer_user_id,
            decision=decision,
            note=note,
        )
        db.add(review)
    else:
        review.decision = decision
        review.note = note
        review.updated_at = now_utc()

    db.flush()

    contribution = db.get(Contribution, contribution_id)
    reviews = (
        db.query(ContributionMemberConfirmation)
        .filter(ContributionMemberConfirmation.contribution_id == contribution_id)
        .all()
    )

    confirms = [row for row in reviews if row.decision == "confirm"]
    disputes = [row for row in reviews if row.decision == "dispute"]

    if disputes:
        contribution.status = "disputed"
    elif contribution.status == "confirmed" and len(confirms) >= 2:
        contribution.status = "group_verified"

    db.commit()

    return {
        "ok": True,
        "decision": decision,
        "confirmations": len(confirms),
        "disputes": len(disputes),
        "contribution_status": contribution.status,
    }


@router.post("/contributions/{contribution_id}/member-confirm")
def member_confirm_receipt(
    contribution_id: str,
    payload: ReviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contribution = db.get(Contribution, contribution_id)
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")

    group_id = contribution_group_id(db, contribution)
    member = get_member(db, group_id, current_user.id)

    if member.status not in {"active", "completed"}:
        raise HTTPException(status_code=400, detail="Only active group members can review receipts.")

    if contribution.payer_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot confirm your own receipt.")

    if not contribution.proof_url:
        raise HTTPException(status_code=400, detail="No receipt or proof has been uploaded yet.")

    return upsert_member_receipt_review(
        contribution_id=contribution_id,
        reviewer_user_id=current_user.id,
        decision="confirm",
        note=payload.note,
        db=db,
    )


@router.post("/contributions/{contribution_id}/member-dispute")
def member_dispute_receipt(
    contribution_id: str,
    payload: ReviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contribution = db.get(Contribution, contribution_id)
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")

    group_id = contribution_group_id(db, contribution)
    member = get_member(db, group_id, current_user.id)

    if member.status not in {"active", "completed"}:
        raise HTTPException(status_code=400, detail="Only active group members can dispute receipts.")

    if contribution.payer_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot dispute your own receipt.")

    if not contribution.proof_url:
        raise HTTPException(status_code=400, detail="No receipt or proof has been uploaded yet.")

    return upsert_member_receipt_review(
        contribution_id=contribution_id,
        reviewer_user_id=current_user.id,
        decision="dispute",
        note=payload.note,
        db=db,
    )