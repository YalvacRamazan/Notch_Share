from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base 

class Course(Base):
  __tablename__ = "courses"
  id = Column(Integer, primary_key=True, index=True)
  name = Column(String, unique=True)
  slug = Column(String, unique=True) # Url
  vize_date = Column(String, nullable=True)
  final_date = Column(String, nullable=True)
  notes = relationship("Note", back_populates="course")

class Note(Base):
  __tablename__ = "notes"
  id = Column(Integer, primary_key=True, index=True)
  title = Column(String)
  note_type = Column(String, default="pdf")
  file_path = Column(String, nullable=True)
  content = Column(String, nullable=True)
  upload_date = Column(DateTime, default=datetime.utcnow)
  course_id = Column(Integer, ForeignKey("courses.id"))
  course = relationship("Course", back_populates="notes")

class Admin(Base):
  __tablename__ = "admins"
  id = Column(Integer, primary_key=True, index=True)
  username = Column(String, unique=True)
  password_hash = Column(String)

class Log(Base):
  __tablename__ = "logs"
  id = Column(Integer, primary_key=True, index=True)
  admin_name = Column(String)
  action = Column(String) # Exp: "New Notes!"
  timestamp = Column(DateTime, default=datetime.utcnow)

