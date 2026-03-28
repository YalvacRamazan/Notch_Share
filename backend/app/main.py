import markdown
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from .db import models, database
import os

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="YBS_NOTCH API")

app.mount("/static", StaticFiles(directory="frontend/static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# Public Endpoints
@app.get("/")
def read_root():
  return FileResponse("frontend/static/index.html")

@app.get("/course")
def read_course():
  return FileResponse("frontend/static/course.html")
    
# List Lessons
@app.get("/api/courses")
def get_courses(db: Session = Depends(database.get_db)):
  courses = db.query(models.Course).all()
  return courses

# Specific lesson inf.
@app.get("/api/courses/{slug}")
def get_course_details(slug: str, db: Session = Depends(database.get_db)):
  course = db.query(models.Course).filter(models.Course.slug == slug).first()
  
  if not course:
    raise HTTPException(status_code=404, detail="Ders_Bulunamadı")
  return course
@app.get("/api/courses/{course_id}/notes")
def get_notes(course_id: int, db: Session = Depends(database.get_db)):
  course = db.query(models.Course).filter(models.Course.id == course_id).first()
  if not course:
    raise HTTPException(status_code=404, detail="Ders Bulunamadı")
    
  notes = db.query(models.Note).filter(models.Note.course_id == course_id).all()
  processed_notes = []
  for note in notes:
    note_data = {
      "id": note.id,
      "title": note.title,
      "note_type": note.note_type,
      "file_path": note.file_path,
      "content": note.content
    }

    if note.note_type == "markdown" and note.file_path:
      md_path = os.path.join("markdown_notes", course.slug, note.file_path)
      if os.path.exists(md_path):
        with open(md_path, "r", encoding="utf-8") as f:
          md_text = f.read()
          note_data["content"] = markdown.markdown(md_text, extensions=['extra', 'codehilite'])
      else:
        note_data["content"] = "<p style='color:red;'>Not dosyasi bulunamadi!</p>"
    processed_notes.append(note_data)
  return processed_notes
  

# Admin Permissions