"""Admin paneli uygulamasi.

Ana siteden bagimsiz, ayri portta calisan yonetim arayuzu.
Giris: admins tablosundaki bcrypt hash'i ile dogrulama + imzali oturum cerezi.
Cloudflared Access gibi bir kimlik dogrulama katmaninin arkasina takviye
olarak tasarlandi; tek basina da calisabilir.
"""

import hashlib
import hmac
import os
import re
import secrets
import time
from datetime import datetime
from urllib.parse import urlparse

import bcrypt
from fastapi import (Depends, FastAPI, File, Form, HTTPException, Request,
                     Response, UploadFile)
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from .db import database, models

models.Base.metadata.create_all(bind=database.engine)

admin_app = FastAPI(
    title="YBS_NOTCH Admin",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# --- Ayarlar ---
SESSION_COOKIE = "ybs_admin_session"
SESSION_TTL_SECONDS = 8 * 60 * 60  # 8 saat
# ADMIN_SESSION_SECRET tanimli degse surec basina rastgele uretilir
# (restart sonrasi oturumlar sifirlanir). Uretimde .env uzerinden sabitleyin.
SESSION_SECRET = os.getenv("ADMIN_SESSION_SECRET") or secrets.token_hex(32)
COOKIE_SECURE = os.getenv("ADMIN_COOKIE_SECURE", "false").lower() == "true"

MAX_TITLE_LENGTH = 200
MAX_DATE_LENGTH = 50
MAX_SLUG_LENGTH = 80
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20MB

PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
MARKDOWN_EXTENSIONS = {".md", ".markdown"}
NOTE_TYPES = {"pdf", "image", "markdown", "text", "link"}
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# Basit brute-force sinirlama (surec icinde tutulur)
FAILED_LOGINS = {}
MAX_FAILED_ATTEMPTS = 5
FAILED_WINDOW_SECONDS = 600
BLOCK_SECONDS = 300


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        return response


admin_app.add_middleware(SecurityHeadersMiddleware)


# --- Oturum yardimcilari (stateless imzali cerez) ---
def _sign(payload: str) -> str:
    return hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_session_token(username: str) -> str:
    expires = int(time.time()) + SESSION_TTL_SECONDS
    payload = f"{username}|{expires}"
    return f"{payload}|{_sign(payload)}"


def verify_session_token(token: str):
    try:
        username, expires, signature = token.split("|")
        if int(expires) < time.time():
            return None
        if not hmac.compare_digest(_sign(f"{username}|{expires}"), signature):
            return None
        return username
    except (ValueError, TypeError):
        return None


def require_admin(request: Request) -> str:
    token = request.cookies.get(SESSION_COOKIE)
    username = verify_session_token(token) if token else None
    if not username:
        raise HTTPException(status_code=401, detail="Oturum bulunamadi veya suresi doldu")
    return username


# --- Brute-force sinirlama ---
def _blocked_until(ip: str):
    entry = FAILED_LOGINS.get(ip)
    if entry and entry.get("blocked_until") and entry["blocked_until"] > time.time():
        return entry["blocked_until"]
    return None


def _register_failed_attempt(ip: str):
    now = time.time()
    entry = FAILED_LOGINS.get(ip, {"attempts": [], "blocked_until": None})
    entry["attempts"] = [t for t in entry["attempts"] if now - t < FAILED_WINDOW_SECONDS]
    entry["attempts"].append(now)
    if len(entry["attempts"]) >= MAX_FAILED_ATTEMPTS:
        entry["blocked_until"] = now + BLOCK_SECONDS
        entry["attempts"] = []
    FAILED_LOGINS[ip] = entry


# --- Dogrulama / dosya yardimcilari ---
def clean_text(value, field: str, max_length: int, allow_empty: bool = False) -> str:
    value = (value or "").strip()
    if not value and not allow_empty:
        raise HTTPException(status_code=422, detail=f"{field} bos olamaz")
    if len(value) > max_length:
        raise HTTPException(status_code=422, detail=f"{field} cok uzun (en fazla {max_length} karakter)")
    if "<" in value or ">" in value:
        raise HTTPException(status_code=422, detail=f"{field} '<' veya '>' karakteri iceremez")
    return value


def validate_slug(slug: str) -> str:
    slug = (slug or "").strip().lower()
    if len(slug) > MAX_SLUG_LENGTH or not SLUG_PATTERN.fullmatch(slug):
        raise HTTPException(
            status_code=422,
            detail="Slug gecersiz. Kucuk harf, rakam ve tire kullanin (orn: veri-yapilari)",
        )
    return slug


def validate_link(url: str) -> str:
    url = (url or "").strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=422, detail="Gecerli bir http/https baglantisi girin")
    return url


def safe_filename(filename: str) -> str:
    base = os.path.basename((filename or "").replace("\\", "/"))
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base).strip("._")
    if not base:
        raise HTTPException(status_code=422, detail="Gecerli bir dosya adi gerekli")
    return base


def validate_extension(filename: str, allowed: set, label: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"{label} icin izinli uzantilar: {', '.join(sorted(allowed))}",
        )
    return ext


def read_upload(upload: UploadFile) -> bytes:
    data = upload.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Dosya cok buyuk (en fazla 20MB)")
    return data


def unique_path(directory: str, filename: str) -> str:
    path = os.path.join(directory, filename)
    if not os.path.exists(path):
        return path
    stem, ext = os.path.splitext(filename)
    counter = 1
    while True:
        candidate = os.path.join(directory, f"{stem}-{counter}{ext}")
        if not os.path.exists(candidate):
            return candidate
        counter += 1


def note_file_path(course, note):
    """Notun diskteki dosya yolunu dondurur; guvenli degilse None."""
    if not note.file_path:
        return None
    if note.note_type == "markdown":
        base = os.path.abspath(os.path.join("markdown_notes", course.slug))
    elif note.note_type in ("pdf", "image"):
        base = os.path.abspath(os.path.join("uploads", course.slug))
    else:
        return None
    path = os.path.abspath(os.path.join(base, note.file_path))
    if not path.startswith(base + os.sep):
        return None
    return path


def get_course_or_404(db: Session, course_id: int):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Ders bulunamadi")
    return course


def course_dict(course) -> dict:
    return {
        "id": course.id,
        "name": course.name,
        "slug": course.slug,
        "vize_date": course.vize_date,
        "final_date": course.final_date,
        "note_count": len(course.notes),
    }


def log_action(db: Session, admin_name: str, action: str):
    db.add(models.Log(admin_name=admin_name, action=action))


# --- Istek modelleri ---
class LoginRequest(BaseModel):
    username: str
    password: str


class CourseCreate(BaseModel):
    name: str
    slug: str
    vize_date: str | None = None
    final_date: str | None = None


class CourseUpdate(BaseModel):
    name: str | None = None
    vize_date: str | None = None
    final_date: str | None = None


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


# --- Kimlik dogrulama uclari ---
@admin_app.post("/admin/api/login")
def login(request: Request, response: Response, payload: LoginRequest,
          db: Session = Depends(database.get_db)):
    client_ip = request.client.host if request.client else "unknown"
    if _blocked_until(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Cok fazla hatali deneme. Lutfen 5 dakika sonra tekrar deneyin.",
        )

    admin = db.query(models.Admin).filter(
        models.Admin.username == payload.username.strip()
    ).first()
    valid = admin and bcrypt.checkpw(
        payload.password.encode("utf-8"), admin.password_hash.encode("utf-8")
    )
    if not valid:
        _register_failed_attempt(client_ip)
        time.sleep(1)  # kaba kuvvet denemelerini yavaslat
        raise HTTPException(status_code=401, detail="Kullanici adi veya parola hatali")

    FAILED_LOGINS.pop(client_ip, None)
    response.set_cookie(
        SESSION_COOKIE,
        create_session_token(admin.username),
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )
    log_action(db, admin.username, "Admin paneline giris yapildi")
    db.commit()
    return {"username": admin.username}


@admin_app.post("/admin/api/logout")
def logout(response: Response, username: str = Depends(require_admin)):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"detail": "Cikis yapildi"}


@admin_app.get("/admin/api/me")
def me(username: str = Depends(require_admin)):
    return {"username": username}


# --- Ders yonetimi ---
@admin_app.get("/admin/api/courses")
def list_courses(db: Session = Depends(database.get_db),
                 username: str = Depends(require_admin)):
    courses = db.query(models.Course).order_by(models.Course.id).all()
    return [course_dict(c) for c in courses]


@admin_app.post("/admin/api/courses", status_code=201)
def create_course(payload: CourseCreate, db: Session = Depends(database.get_db),
                  username: str = Depends(require_admin)):
    name = clean_text(payload.name, "Ders adi", MAX_TITLE_LENGTH)
    slug = validate_slug(payload.slug)
    exists = db.query(models.Course).filter(
        (models.Course.slug == slug) | (models.Course.name == name)
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="Ayni ada veya slug'a sahip bir ders zaten var")

    course = models.Course(
        name=name,
        slug=slug,
        vize_date=clean_text(payload.vize_date, "Vize tarihi", MAX_DATE_LENGTH, True) or None,
        final_date=clean_text(payload.final_date, "Final tarihi", MAX_DATE_LENGTH, True) or None,
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    os.makedirs(os.path.join("uploads", slug), exist_ok=True)
    os.makedirs(os.path.join("markdown_notes", slug), exist_ok=True)

    log_action(db, username, f"Ders eklendi: {name}")
    db.commit()
    return course_dict(course)


@admin_app.put("/admin/api/courses/{course_id}")
def update_course(course_id: int, payload: CourseUpdate,
                  db: Session = Depends(database.get_db),
                  username: str = Depends(require_admin)):
    course = get_course_or_404(db, course_id)
    if payload.name is not None:
        course.name = clean_text(payload.name, "Ders adi", MAX_TITLE_LENGTH)
    if payload.vize_date is not None:
        course.vize_date = clean_text(payload.vize_date, "Vize tarihi", MAX_DATE_LENGTH, True) or None
    if payload.final_date is not None:
        course.final_date = clean_text(payload.final_date, "Final tarihi", MAX_DATE_LENGTH, True) or None
    db.commit()
    log_action(db, username, f"Ders guncellendi: {course.name}")
    db.commit()
    return course_dict(course)


@admin_app.delete("/admin/api/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(database.get_db),
                  username: str = Depends(require_admin)):
    course = get_course_or_404(db, course_id)
    for note in list(course.notes):
        path = note_file_path(course, note)
        if path and os.path.exists(path):
            os.remove(path)
        db.delete(note)
    name = course.name
    db.delete(course)
    db.commit()
    log_action(db, username, f"Ders silindi: {name}")
    db.commit()
    return {"detail": "Ders silindi"}


# --- Not yonetimi ---
@admin_app.get("/admin/api/courses/{course_id}/notes")
def list_notes(course_id: int, db: Session = Depends(database.get_db),
               username: str = Depends(require_admin)):
    course = get_course_or_404(db, course_id)
    notes = sorted(course.notes, key=lambda n: n.upload_date or datetime.utcnow(), reverse=True)
    result = []
    for note in notes:
        item = {
            "id": note.id,
            "title": note.title,
            "note_type": note.note_type,
            "file_path": note.file_path,
            "upload_date": note.upload_date.isoformat() if note.upload_date else None,
            "content": None,
        }
        if note.note_type in ("text", "link"):
            item["content"] = note.content
        elif note.note_type == "markdown":
            path = note_file_path(course, note)
            if path and os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    item["content"] = f.read()
        result.append(item)
    return result


@admin_app.post("/admin/api/courses/{course_id}/notes", status_code=201)
async def create_note(
    course_id: int,
    title: str = Form(...),
    note_type: str = Form(...),
    content: str | None = Form(None),
    filename: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(database.get_db),
    username: str = Depends(require_admin),
):
    course = get_course_or_404(db, course_id)
    title = clean_text(title, "Baslik", MAX_TITLE_LENGTH)
    if note_type not in NOTE_TYPES:
        raise HTTPException(status_code=422, detail="Gecersiz not tipi")

    file_path = None
    stored_content = None

    if note_type == "text":
        stored_content = (content or "").strip()
        if not stored_content:
            raise HTTPException(status_code=422, detail="Not icerigi bos olamaz")
    elif note_type == "link":
        stored_content = validate_link(content or "")
    elif note_type == "markdown":
        md_name = safe_filename(filename or "")
        validate_extension(md_name, MARKDOWN_EXTENSIONS, "Markdown dosyasi")
        md_text = content or ""
        if not md_text.strip():
            raise HTTPException(status_code=422, detail="Markdown icerigi bos olamaz")
        md_dir = os.path.join("markdown_notes", course.slug)
        os.makedirs(md_dir, exist_ok=True)
        target = unique_path(md_dir, md_name)
        with open(target, "w", encoding="utf-8") as f:
            f.write(md_text)
        file_path = os.path.basename(target)
    elif note_type in ("pdf", "image"):
        if file is None:
            raise HTTPException(status_code=422, detail="Dosya yuklenmedi")
        allowed = PDF_EXTENSIONS if note_type == "pdf" else IMAGE_EXTENSIONS
        safe_name = safe_filename(file.filename or "")
        validate_extension(safe_name, allowed, "Yuklenen dosya")
        data = read_upload(file)
        up_dir = os.path.join("uploads", course.slug)
        os.makedirs(up_dir, exist_ok=True)
        target = unique_path(up_dir, safe_name)
        with open(target, "wb") as f:
            f.write(data)
        file_path = os.path.basename(target)

    note = models.Note(
        title=title,
        note_type=note_type,
        file_path=file_path,
        content=stored_content,
        course_id=course.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    log_action(db, username, f"Not eklendi: {title} ({course.name})")
    db.commit()
    return {
        "id": note.id,
        "title": note.title,
        "note_type": note.note_type,
        "file_path": note.file_path,
    }


@admin_app.put("/admin/api/notes/{note_id}")
async def update_note(note_id: int, payload: NoteUpdate,
                      db: Session = Depends(database.get_db),
                      username: str = Depends(require_admin)):
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Not bulunamadi")
    course = note.course

    if payload.title is not None:
        note.title = clean_text(payload.title, "Baslik", MAX_TITLE_LENGTH)

    if payload.content is not None:
        if note.note_type == "link":
            note.content = validate_link(payload.content)
        elif note.note_type == "text":
            content = payload.content.strip()
            if not content:
                raise HTTPException(status_code=422, detail="Not icerigi bos olamaz")
            note.content = content
        elif note.note_type == "markdown":
            path = note_file_path(course, note)
            if not path:
                raise HTTPException(status_code=422, detail="Bu notun markdown dosyasi bulunamadi")
            with open(path, "w", encoding="utf-8") as f:
                f.write(payload.content)

    db.commit()
    log_action(db, username, f"Not guncellendi: {note.title} ({course.name})")
    db.commit()
    return {"detail": "Not guncellendi"}


@admin_app.delete("/admin/api/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(database.get_db),
                username: str = Depends(require_admin)):
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Not bulunamadi")
    course = note.course
    path = note_file_path(course, note)
    if path and os.path.exists(path):
        os.remove(path)
    title = note.title
    db.delete(note)
    db.commit()
    log_action(db, username, f"Not silindi: {title} ({course.name})")
    db.commit()
    return {"detail": "Not silindi"}


# --- Sayfalar ---
@admin_app.get("/")
def admin_root():
    return RedirectResponse("/admin", status_code=303)


@admin_app.get("/admin")
def admin_login_page():
    return FileResponse("frontend/admin/index.html")


@admin_app.get("/admin/panel")
def admin_panel_page(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    if not token or not verify_session_token(token):
        return RedirectResponse("/admin", status_code=303)
    return FileResponse("frontend/admin/panel.html")


admin_app.mount("/admin/static", StaticFiles(directory="frontend/admin"), name="admin_static")
