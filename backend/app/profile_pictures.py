import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db, settings
from .models import User

router = APIRouter(prefix="/profile-picture", tags=["profile picture"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_PROFILE_IMAGE_BYTES = 3 * 1024 * 1024


def profile_picture_dir() -> Path:
    upload_root = Path(settings.upload_dir)
    directory = upload_root / "profile_pictures"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def public_profile_url(filename: str) -> str:
    return f"/uploads/profile_pictures/{filename}"


def remove_old_profile_picture(old_url: str | None):
    if not old_url:
        return

    if not old_url.startswith("/uploads/profile_pictures/"):
        return

    filename = old_url.split("/")[-1]
    path = profile_picture_dir() / filename

    try:
        if path.exists():
            path.unlink()
    except OSError:
        pass


@router.get("/me")
def get_my_profile_picture(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.execute(
        text(
            """
            SELECT profile_picture_url
            FROM users
            WHERE id = :user_id
            """
        ),
        {"user_id": current_user.id},
    ).mappings().first()

    return {
        "profile_picture_url": row["profile_picture_url"] if row else None,
    }


@router.post("/me")
async def upload_my_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile picture must be a JPG, PNG, or WebP image.",
        )

    contents = await file.read()

    if len(contents) > MAX_PROFILE_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile picture must be 3MB or smaller.",
        )

    extension = ALLOWED_IMAGE_TYPES[file.content_type]
    filename = f"{current_user.id}-{uuid.uuid4().hex}{extension}"
    destination = profile_picture_dir() / filename

    with destination.open("wb") as buffer:
        buffer.write(contents)

    new_url = public_profile_url(filename)

    old_row = db.execute(
        text(
            """
            SELECT profile_picture_url
            FROM users
            WHERE id = :user_id
            """
        ),
        {"user_id": current_user.id},
    ).mappings().first()

    db.execute(
        text(
            """
            UPDATE users
            SET profile_picture_url = :profile_picture_url
            WHERE id = :user_id
            """
        ),
        {
            "profile_picture_url": new_url,
            "user_id": current_user.id,
        },
    )

    db.commit()

    if old_row:
        remove_old_profile_picture(old_row["profile_picture_url"])

    return {
        "profile_picture_url": new_url,
    }


@router.delete("/me")
def remove_my_profile_picture(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_row = db.execute(
        text(
            """
            SELECT profile_picture_url
            FROM users
            WHERE id = :user_id
            """
        ),
        {"user_id": current_user.id},
    ).mappings().first()

    db.execute(
        text(
            """
            UPDATE users
            SET profile_picture_url = NULL
            WHERE id = :user_id
            """
        ),
        {"user_id": current_user.id},
    )

    db.commit()

    if old_row:
        remove_old_profile_picture(old_row["profile_picture_url"])

    return {
        "profile_picture_url": None,
    }