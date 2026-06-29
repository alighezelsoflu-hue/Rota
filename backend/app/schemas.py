from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str | None
    verification_status: str
    trust_score: int
    created_at: datetime

    class Config:
        from_attributes = True


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    contribution_amount: float = Field(gt=0)
    currency: str = Field(default="EUR", min_length=3, max_length=8)
    frequency: str = Field(default="monthly", pattern="^(weekly|monthly)$")
    member_limit: int = Field(default=10, ge=2, le=50)
    payout_method: str = Field(default="fixed_rotation")


class GroupOut(BaseModel):
    id: str
    name: str
    organizer_id: str
    contribution_amount: float
    currency: str
    frequency: str
    member_limit: int
    payout_method: str
    invite_code: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class JoinGroupRequest(BaseModel):
    invite_code: str


class MemberOut(BaseModel):
    id: str
    group_id: str
    user_id: str
    name: str | None = None
    email: str | None = None
    role: str
    position: int
    status: str
    joined_at: datetime

    class Config:
        from_attributes = True


class CycleCreate(BaseModel):
    due_date: datetime


class CycleOut(BaseModel):
    id: str
    group_id: str
    cycle_number: int
    receiver_user_id: str
    receiver_name: str | None = None
    due_date: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ContributionOut(BaseModel):
    id: str
    cycle_id: str
    payer_user_id: str
    payer_name: str | None = None
    receiver_user_id: str
    receiver_name: str | None = None
    amount: float
    status: str
    proof_url: str | None = None
    payment_reference: str | None = None
    note: str | None = None
    paid_at: datetime | None = None
    confirmed_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class DisputeCreate(BaseModel):
    reason: str = Field(min_length=5, max_length=2000)


class AuditLogOut(BaseModel):
    id: str
    group_id: str | None
    user_id: str | None
    action: str
    details: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class GroupDetail(BaseModel):
    group: GroupOut
    members: list[MemberOut]
    cycles: list[CycleOut]
    contributions: list[ContributionOut]
    audit_logs: list[AuditLogOut]
