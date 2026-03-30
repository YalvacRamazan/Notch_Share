from backend.app.db.database import SessionLocal, engine, Base
from backend.app.db import models
import bcrypt
import os



def init():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        dersler = [
            {"name": "Müşteri İlişkileri Yönetimi","slug": "veri-yapilari"},
            {"name": "Bilgisayar Ağlarına Giriş","slug": "bilgisayar-aglarina-giris"},
            {"name": "Gönüllülük Çalışmaları","slug": "gonulluluk-calismalari"},
            {"name": "Örgüt Kültürü ve İş Etiği","slug": "orgut-kulturu-ve-is-etigi"},
            {"name": "İstatistik","slug": "istatistik"},
            {"name": "Üretim Yönetimi","slug": "uretim-yonetimi"}
        ]

        for d in dersler:
            exists = db.query(models.Course).filter(models.Course.slug == d ["slug"]).first()
            if not exists:
                new_course = models.Course(
                    name=d["name"],
                    slug=d["slug"],
                )
                db.add(new_course)
                print(f"Eklendi: {d['name']}")
                
            upl_dir = os.path.join("uploads", d["slug"])
            md_dir = os.path.join("markdown_notes", d["slug"])
            os.makedirs(upl_dir, exist_ok=True)
            os.makedirs(md_dir, exist_ok=True)
            
            # Kalicilik saglamak amaciyla .gitkeep olusturalim
            with open(os.path.join(upl_dir, ".gitkeep"), "w") as f: f.write("")
            with open(os.path.join(md_dir, ".gitkeep"), "w") as f: f.write("")
        admin_exists = db.query(models.Admin).filter(models.Admin.username == "rumata").first()
        if not admin_exists:
            password = "rumata1!"
            salt = bcrypt.gensalt()
            hashed_pw = bcrypt.hashpw(password.encode('utf-8'), salt)

            new_admin = models.Admin(username="rumata", password_hash=hashed_pw.decode('utf-8'))
            db.add(new_admin)
            print("Admin 'rumata' olusturuldu.")
        db.commit()
        print("Islem gerceklesti")
    except Exception as e:
        print(f"hata: {e}")
        db.rollback()
    finally:
        db.close()
if __name__ == "__main__":
    init()
