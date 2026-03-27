from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database path (YBS_NOTCH)
# Tasinabilirlik (Sqlite)
# Engine olusturma (SQLite -> check_same_thread False olmali)
# Database ile konusacak olan 'session class'
# Modellerimizin temel sinifi

SQLALCHEMY_DATABASE_URL = "sqlite:///./ybs_notlar.db"

engine = create_engine(
  SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Database session management 'DEPENDENCY'
def get_db():
  db = SessionLocal()
  try:
      yield db
  finally:
    db.close()



