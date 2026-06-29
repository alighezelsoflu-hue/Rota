import os
import secrets
from datetime import datetime, timezone
from typing import Iterable

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, hash_password, verify_password
from .database import Base, engine, get_db, settings
from .models import AuditLog, Contribution, Cycle, Dispute, Group, GroupMember, User
from .schemas import (
    AuditLogOut,
    ContributionOut,
    CycleCreate,
    CycleOut,
    DisputeCreate,
    GroupCreate,
    GroupDetail,
    GroupOut,
    JoinGroupRequest,
    MemberOut,
    NetworkEdge,
    NetworkGraph,
    NetworkNode,
    NetworkStats,
    Token,
    UserCreate,
    UserLogin,
    UserOut,
)

Base.metadata.create_all(bind=engine)
os.makedirs(settings.upload_dir, exist_ok=True)

app = FastAPI(title="Rota MVP API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


def log_action(db: Session, action: str, user_id: str | None = None, group_id: str | None = None, details: str | None = None) -> None:
    db.add(AuditLog(action=action, user_id=user_id, group_id=group_id, details=details))


def generate_invite_code(db: Session) -> str:
    for _ in range(20):
        code = secrets.token_hex(4).upper()
        exists = db.scalar(select(Group).where(Group.invite_code == code))
        if not exists:
            return code
    raise HTTPException(500, "Could not generate invite code")


def require_member(db: Session, group_id: str, user_id: str) -> GroupMember:
    member = db.scalar(select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id))
    if not member:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not a member of this group")
    return member


def require_organizer(db: Session, group_id: str, user_id: str) -> GroupMember:
    member = require_member(db, group_id, user_id)
    if member.role not in {"organizer", "co_organizer"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Organizer or co-organizer role required")
    return member


def get_user_names(db: Session, user_ids: Iterable[str]) -> dict[str, User]:
    ids = list(set(user_ids))
    if not ids:
        return {}
    users = db.scalars(select(User).where(User.id.in_(ids))).all()
    return {user.id: user for user in users}


def to_member_out(db: Session, member: GroupMember) -> MemberOut:
    user = db.get(User, member.user_id)
    return MemberOut(
        id=member.id,
        group_id=member.group_id,
        user_id=member.user_id,
        name=user.name if user else None,
        email=user.email if user else None,
        role=member.role,
        position=member.position,
        status=member.status,
        joined_at=member.joined_at,
    )


def to_cycle_out(db: Session, cycle: Cycle) -> CycleOut:
    receiver = db.get(User, cycle.receiver_user_id)
    return CycleOut(
        id=cycle.id,
        group_id=cycle.group_id,
        cycle_number=cycle.cycle_number,
        receiver_user_id=cycle.receiver_user_id,
        receiver_name=receiver.name if receiver else None,
        due_date=cycle.due_date,
        status=cycle.status,
        created_at=cycle.created_at,
    )


def to_contribution_out(db: Session, c: Contribution) -> ContributionOut:
    users = get_user_names(db, [c.payer_user_id, c.receiver_user_id])
    return ContributionOut(
        id=c.id,
        cycle_id=c.cycle_id,
        payer_user_id=c.payer_user_id,
        payer_name=users.get(c.payer_user_id).name if users.get(c.payer_user_id) else None,
        receiver_user_id=c.receiver_user_id,
        receiver_name=users.get(c.receiver_user_id).name if users.get(c.receiver_user_id) else None,
        amount=c.amount,
        status=c.status,
        proof_url=c.proof_url,
        payment_reference=c.payment_reference,
        note=c.note,
        paid_at=c.paid_at,
        confirmed_at=c.confirmed_at,
        created_at=c.created_at,
    )


def recalculate_trust_score(db: Session, user: User) -> None:
    total = db.scalars(select(Contribution).where(Contribution.payer_user_id == user.id)).all()
    confirmed = sum(1 for c in total if c.status == "confirmed")
    disputed = sum(1 for c in total if c.status == "disputed")
    overdue = sum(1 for c in total if c.status == "overdue")
    pending_paid = sum(1 for c in total if c.status == "paid")
    score = 50 + confirmed * 3 + pending_paid - disputed * 15 - overdue * 10
    user.trust_score = max(0, min(100, score))


@app.get("/health")
def health():
    return {"status": "ok", "service": "rota-mvp"}


@app.get("/")
def root():
    return {"app": "Rota MVP API", "status": "live", "docs": "/docs", "health": "/health"}


@app.post("/auth/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        phone=payload.phone,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.id))


@app.post("/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return Token(access_token=create_access_token(user.id))


@app.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/groups", response_model=GroupOut)
def create_group(payload: GroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = Group(
        name=payload.name.strip(),
        organizer_id=current_user.id,
        contribution_amount=payload.contribution_amount,
        currency=payload.currency.upper(),
        frequency=payload.frequency,
        member_limit=payload.member_limit,
        payout_method=payload.payout_method,
        invite_code=generate_invite_code(db),
    )
    db.add(group)
    db.flush()
    db.add(GroupMember(group_id=group.id, user_id=current_user.id, role="organizer", position=1))
    log_action(db, "group_created", current_user.id, group.id, f"Group '{group.name}' created")
    db.commit()
    db.refresh(group)
    return group


@app.get("/groups", response_model=list[GroupOut])
def list_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.scalars(select(GroupMember).where(GroupMember.user_id == current_user.id)).all()
    group_ids = [m.group_id for m in memberships]
    if not group_ids:
        return []
    return db.scalars(select(Group).where(Group.id.in_(group_ids)).order_by(Group.created_at.desc())).all()


@app.post("/groups/join", response_model=GroupOut)
def join_group(payload: JoinGroupRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = db.scalar(select(Group).where(Group.invite_code == payload.invite_code.strip().upper()))
    if not group:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invite code not found")
    existing = db.scalar(select(GroupMember).where(GroupMember.group_id == group.id, GroupMember.user_id == current_user.id))
    if existing:
        return group
    count = len(db.scalars(select(GroupMember).where(GroupMember.group_id == group.id)).all())
    if count >= group.member_limit:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Group member limit reached")
    db.add(GroupMember(group_id=group.id, user_id=current_user.id, role="member", position=count + 1))
    log_action(db, "member_joined", current_user.id, group.id, f"{current_user.name} joined with invite code")
    db.commit()
    return group


@app.get("/groups/{group_id}", response_model=GroupDetail)
def group_detail(group_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    require_member(db, group_id, current_user.id)
    members = db.scalars(select(GroupMember).where(GroupMember.group_id == group_id).order_by(GroupMember.position)).all()
    cycles = db.scalars(select(Cycle).where(Cycle.group_id == group_id).order_by(Cycle.cycle_number.desc())).all()
    contributions = []
    if cycles:
        cycle_ids = [c.id for c in cycles]
        contributions = db.scalars(select(Contribution).where(Contribution.cycle_id.in_(cycle_ids)).order_by(Contribution.created_at.desc())).all()
    logs = db.scalars(select(AuditLog).where(AuditLog.group_id == group_id).order_by(AuditLog.created_at.desc()).limit(50)).all()
    return GroupDetail(
        group=group,
        members=[to_member_out(db, m) for m in members],
        cycles=[to_cycle_out(db, c) for c in cycles],
        contributions=[to_contribution_out(db, c) for c in contributions],
        audit_logs=[AuditLogOut.model_validate(log) for log in logs],
    )


@app.post("/groups/{group_id}/cycles", response_model=CycleOut)
def create_cycle(group_id: str, payload: CycleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    require_organizer(db, group_id, current_user.id)
    members = db.scalars(select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.status == "active").order_by(GroupMember.position)).all()
    if len(members) < 2:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "At least 2 active members are required")
    latest = db.scalars(select(Cycle).where(Cycle.group_id == group_id).order_by(Cycle.cycle_number.desc())).first()
    next_number = 1 if latest is None else latest.cycle_number + 1
    receiver_member = members[(next_number - 1) % len(members)]
    cycle = Cycle(group_id=group_id, cycle_number=next_number, receiver_user_id=receiver_member.user_id, due_date=payload.due_date)
    db.add(cycle)
    db.flush()
    for member in members:
        if member.user_id == receiver_member.user_id:
            continue
        db.add(
            Contribution(
                cycle_id=cycle.id,
                payer_user_id=member.user_id,
                receiver_user_id=receiver_member.user_id,
                amount=group.contribution_amount,
                status="pending",
            )
        )
    log_action(db, "cycle_created", current_user.id, group_id, f"Cycle {next_number} created")
    db.commit()
    db.refresh(cycle)
    return to_cycle_out(db, cycle)


@app.post("/contributions/{contribution_id}/pay", response_model=ContributionOut)
async def mark_paid(
    contribution_id: str,
    payment_reference: str = Form(default=""),
    note: str = Form(default=""),
    proof: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contribution = db.get(Contribution, contribution_id)
    if not contribution:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contribution not found")
    if contribution.payer_user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the payer can mark this contribution as paid")
    proof_url = contribution.proof_url
    if proof and proof.filename:
        safe_name = f"{contribution_id}-{secrets.token_hex(4)}-{os.path.basename(proof.filename)}"
        path = os.path.join(settings.upload_dir, safe_name)
        content = await proof.read()
        with open(path, "wb") as f:
            f.write(content)
        proof_url = f"/uploads/{safe_name}"
    contribution.status = "paid"
    contribution.payment_reference = payment_reference.strip() or contribution.payment_reference
    contribution.note = note.strip() or contribution.note
    contribution.proof_url = proof_url
    contribution.paid_at = datetime.now(timezone.utc)
    user = db.get(User, current_user.id)
    if user:
        recalculate_trust_score(db, user)
    cycle = db.get(Cycle, contribution.cycle_id)
    log_action(db, "contribution_marked_paid", current_user.id, cycle.group_id if cycle else None, f"Contribution {contribution.id} marked paid")
    db.commit()
    db.refresh(contribution)
    return to_contribution_out(db, contribution)


@app.post("/contributions/{contribution_id}/confirm", response_model=ContributionOut)
def confirm_contribution(contribution_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contribution = db.get(Contribution, contribution_id)
    if not contribution:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contribution not found")
    cycle = db.get(Cycle, contribution.cycle_id)
    if not cycle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cycle not found")
    if current_user.id != contribution.receiver_user_id:
        require_organizer(db, cycle.group_id, current_user.id)
    contribution.status = "confirmed"
    contribution.confirmed_at = datetime.now(timezone.utc)
    payer = db.get(User, contribution.payer_user_id)
    if payer:
        recalculate_trust_score(db, payer)
    log_action(db, "contribution_confirmed", current_user.id, cycle.group_id, f"Contribution {contribution.id} confirmed")
    db.commit()
    db.refresh(contribution)
    return to_contribution_out(db, contribution)


@app.post("/contributions/{contribution_id}/dispute", response_model=ContributionOut)
def dispute_contribution(contribution_id: str, payload: DisputeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contribution = db.get(Contribution, contribution_id)
    if not contribution:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contribution not found")
    cycle = db.get(Cycle, contribution.cycle_id)
    if not cycle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cycle not found")
    require_member(db, cycle.group_id, current_user.id)
    contribution.status = "disputed"
    db.add(Dispute(contribution_id=contribution.id, opened_by_user_id=current_user.id, reason=payload.reason))
    payer = db.get(User, contribution.payer_user_id)
    if payer:
        recalculate_trust_score(db, payer)
    log_action(db, "contribution_disputed", current_user.id, cycle.group_id, payload.reason)
    db.commit()
    db.refresh(contribution)
    return to_contribution_out(db, contribution)


@app.get("/network", response_model=NetworkGraph)
def trust_network(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return a person/group graph for the logged-in user's trust network."""
    memberships = db.scalars(
        select(GroupMember).where(GroupMember.user_id == current_user.id)
    ).all()
    group_ids = [m.group_id for m in memberships]

    nodes_by_id: dict[str, NetworkNode] = {}
    edges_by_id: dict[str, NetworkEdge] = {}
    person_group_counts: dict[str, int] = {}
    trust_scores: list[int] = []

    def person_node_id(user_id: str) -> str:
        return f"person:{user_id}"

    def group_node_id(group_id: str) -> str:
        return f"group:{group_id}"

    def add_person(user: User, role: str | None = None, status: str | None = None):
        node_id = person_node_id(user.id)
        trust_scores.append(user.trust_score)
        existing = nodes_by_id.get(node_id)
        if existing:
            if role == "current_user":
                existing.role = "current_user"
                existing.status = "you"
            return
        nodes_by_id[node_id] = NetworkNode(
            id=node_id,
            type="person",
            label=user.name,
            subtitle=user.email,
            status=status or ("you" if user.id == current_user.id else "member"),
            role=role or ("current_user" if user.id == current_user.id else "member"),
            trust_score=user.trust_score,
            verification_status=user.verification_status,
            group_count=0,
        )

    add_person(current_user, role="current_user", status="you")

    if not group_ids:
        return NetworkGraph(
            nodes=list(nodes_by_id.values()),
            edges=[],
            stats=NetworkStats(people=1, groups=0, connections=0, strong_connections=0, average_trust=current_user.trust_score),
        )

    groups = db.scalars(select(Group).where(Group.id.in_(group_ids))).all()
    group_map = {g.id: g for g in groups}
    all_members = db.scalars(
        select(GroupMember).where(GroupMember.group_id.in_(group_ids)).order_by(GroupMember.joined_at)
    ).all()
    all_user_ids = sorted({m.user_id for m in all_members})
    users = db.scalars(select(User).where(User.id.in_(all_user_ids))).all()
    user_map = {u.id: u for u in users}

    members_by_group: dict[str, list[GroupMember]] = {}
    for member in all_members:
        members_by_group.setdefault(member.group_id, []).append(member)
        person_group_counts[member.user_id] = person_group_counts.get(member.user_id, 0) + 1

    for group in groups:
        members_for_group = members_by_group.get(group.id, [])
        active_count = sum(1 for m in members_for_group if m.status == "active")
        latest_cycle = db.scalars(
            select(Cycle).where(Cycle.group_id == group.id).order_by(Cycle.cycle_number.desc())
        ).first()
        health = "active" if latest_cycle else "new"
        if latest_cycle:
            contributions = db.scalars(select(Contribution).where(Contribution.cycle_id == latest_cycle.id)).all()
            if any(c.status == "disputed" for c in contributions):
                health = "risk"
            elif contributions and all(c.status == "confirmed" for c in contributions):
                health = "healthy"
            elif any(c.status == "paid" for c in contributions):
                health = "in_progress"

        nodes_by_id[group_node_id(group.id)] = NetworkNode(
            id=group_node_id(group.id),
            type="group",
            label=group.name,
            subtitle=f"{group.contribution_amount:g} {group.currency} · {group.frequency}",
            status=group.status,
            role="group",
            member_count=active_count,
            contribution_amount=group.contribution_amount,
            currency=group.currency,
            frequency=group.frequency,
            health=health,
        )

    for member in all_members:
        user = user_map.get(member.user_id)
        group = group_map.get(member.group_id)
        if not user or not group:
            continue
        add_person(user, role="current_user" if user.id == current_user.id else member.role, status="you" if user.id == current_user.id else member.status)
        node = nodes_by_id.get(person_node_id(user.id))
        if node:
            node.group_count = person_group_counts.get(user.id, 0)
            if user.id == current_user.id:
                node.role = "current_user"
                node.status = "you"
        edge_type = "organizer" if member.role in {"organizer", "co_organizer"} else "membership"
        edge_id = f"{person_node_id(user.id)}->{group_node_id(group.id)}"
        edges_by_id[edge_id] = NetworkEdge(
            id=edge_id,
            source=person_node_id(user.id),
            target=group_node_id(group.id),
            type=edge_type,
            label=member.role.replace("_", " "),
            status=member.status,
            strength=3 if edge_type == "organizer" else 1,
        )

    # Connect groups that share more than one person. This creates the community graph feeling.
    group_list = list(groups)
    for i, left in enumerate(group_list):
        left_users = {m.user_id for m in members_by_group.get(left.id, [])}
        for right in group_list[i + 1:]:
            right_users = {m.user_id for m in members_by_group.get(right.id, [])}
            shared = left_users.intersection(right_users)
            if len(shared) >= 1:
                edge_id = f"{group_node_id(left.id)}->{group_node_id(right.id)}"
                edges_by_id[edge_id] = NetworkEdge(
                    id=edge_id,
                    source=group_node_id(left.id),
                    target=group_node_id(right.id),
                    type="shared_members",
                    label=f"{len(shared)} shared member{'s' if len(shared) != 1 else ''}",
                    status="connected",
                    strength=min(5, 1 + len(shared)),
                )

    people_count = sum(1 for node in nodes_by_id.values() if node.type == "person")
    groups_count = sum(1 for node in nodes_by_id.values() if node.type == "group")
    average_trust = round(sum(set(trust_scores)) / max(1, len(set(trust_scores)))) if trust_scores else current_user.trust_score

    return NetworkGraph(
        nodes=list(nodes_by_id.values()),
        edges=list(edges_by_id.values()),
        stats=NetworkStats(
            people=people_count,
            groups=groups_count,
            connections=len(edges_by_id),
            strong_connections=sum(1 for e in edges_by_id.values() if e.strength >= 3),
            average_trust=average_trust,
        ),
    )
