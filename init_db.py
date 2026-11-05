from backend.app.db.database import SessionLocal, engine, Base
from backend.app.db import models
import bcrypt
import os



def init():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        dersler = [
            {"name": "Müşteri İlişkileri Yönetimi","slug": "musteri-iliskileri-yonetimi"},
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
        # Admin hesabi .env uzerinden ozellestirilebilir (ADMIN_USERNAME / ADMIN_PASSWORD)
        admin_username = os.getenv("ADMIN_USERNAME", "rumata")
        admin_password = os.getenv("ADMIN_PASSWORD", "rumata1!")
        admin_exists = db.query(models.Admin).filter(models.Admin.username == admin_username).first()
        if not admin_exists:
            salt = bcrypt.gensalt()
            hashed_pw = bcrypt.hashpw(admin_password.encode('utf-8'), salt)

            new_admin = models.Admin(username=admin_username, password_hash=hashed_pw.decode('utf-8'))
            db.add(new_admin)
            print(f"Admin '{admin_username}' olusturuldu.")
        db.commit()
        print("Islem gerceklesti")
    except Exception as e:
        print(f"hata: {e}")
        db.rollback()
    finally:
        db.close()
if __name__ == "__main__":
    init()
