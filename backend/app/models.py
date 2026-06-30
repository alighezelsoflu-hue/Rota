import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    verification_status: Mapped[str] = mapped_column(String(40), default="basic")
    trust_score: Mapped[int] = mapped_column(Integer, default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    memberships: Mapped[list["GroupMember"]] = relationship(back_populates="user")


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    organizer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    contribution_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="EUR")
    frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="monthly")
    member_limit: Mapped[int] = mapped_column(Integer, default=10)
    payout_method: Mapped[str] = mapped_column(String(40), default="fixed_rotation")
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    members: Mapped[list["GroupMember"]] = relationship(back_populates="group", cascade="all, delete-orphan")
    cycles: Mapped[list["Cycle"]] = relationship(back_populates="group", cascade="all, delete-orphan")
    agreement_required = Column(Boolean, default=True, nullable=False)
    agreement_text = Column(Text, nullable=True)
    agreement_version = Column(Integer, default=1, nullable=False)

    locked_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    continuation_vote_cycle_id = Column(String, ForeignKey("cycles.id"), nullable=True)
    continuation_vote_opened_at = Column(DateTime(timezone=True), nullable=True)


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_user"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="member")
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    group: Mapped[Group] = relationship(back_populates="members")
    user: Mapped[User] = relationship(back_populates="memberships")
    status = Column(String, default="active", nullable=False)
    agreement_accepted_at = Column(DateTime(timezone=True), nullable=True)
    agreement_version = Column(Integer, nullable=True)
    has_received_payout = Column(Boolean, default=False, nullable=False)


class Cycle(Base):
    __tablename__ = "cycles"
    __table_args__ = (UniqueConstraint("group_id", "cycle_number", name="uq_group_cycle"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id"), nullable=False)
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False)
    receiver_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    group: Mapped[Group] = relationship(back_populates="cycles")
    contributions: Mapped[list["Contribution"]] = relationship(back_populates="cycle", cascade="all, delete-orphan")


class Contribution(Base):
    __tablename__ = "contributions"
    __table_args__ = (UniqueConstraint("cycle_id", "payer_user_id", name="uq_cycle_payer"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    cycle_id: Mapped[str] = mapped_column(String, ForeignKey("cycles.id"), nullable=False)
    payer_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    receiver_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending")
    proof_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    cycle: Mapped[Cycle] = relationship(back_populates="contributions")


class Dispute(Base):
    __tablename__ = "disputes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    contribution_id: Mapped[str] = mapped_column(String, ForeignKey("contributions.id"), nullable=False)
    opened_by_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="open")
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    group_id: Mapped[str | None] = mapped_column(String, ForeignKey("groups.id"), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

class GroupContinuationVote(Base):
    __tablename__ = "group_continuation_votes"
    __table_args__ = (
        UniqueConstraint(
            "group_id",
            "cycle_id",
            "voter_user_id",
            name="uq_group_continuation_vote_once",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    cycle_id = Column(String, ForeignKey("cycles.id", ondelete="CASCADE"), nullable=False)
    voter_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    decision = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ContributionMemberConfirmation(Base):
    __tablename__ = "contribution_member_confirmations"
    __table_args__ = (
        UniqueConstraint(
            "contribution_id",
            "reviewer_user_id",
            name="uq_contribution_member_review_once",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    contribution_id = Column(String, ForeignKey("contributions.id", ondelete="CASCADE"), nullable=False)
    reviewer_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    decision = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)