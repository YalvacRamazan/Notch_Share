import subprocess
import os
from backend.app.db.database import SessionLocal
from backend.app.db import models

def start_interactive_add():
  db = SessionLocal()
  try:
    print("\n" + "="*30)
    print(" MEVCUT DERSLERIN LISTESI")
    print("="*30)
    courses = db.query(models.Course).all()

    if not courses:
      print("Veritabaninda henuz hic ders yok!")
      return
    for c in courses:
      print(f"[{c.id}] -> {c.name}")
    print("="*30 + "\n")

    course_id = input("Notu eklemek istediginiz DERS ID' sini yazin: ")
    title = input("Not icin bir BASLIK gir (ORN: Hafta 1 Ozet): ")
    print("\nNot Tipi: [1] PDF, [2] Resim, [3] Sadece Metin, [4] Markdown (Editor Acilir)")
    tip_secim = input("Seciminiz (1/2/3/4): ")

    note_type = "pdf"
    filename = None
    content = None

    if tip_secim == "3":
      note_type = "text"
      content = input("Not icerigini buraya yazin: ")

    elif tip_secim == "4":
      note_type = "markdown"
      filename = input("Markdown dosya adi (orn: not.md): ")

      if not os.path.exists("markdown_notes"):
        os.makedirs("markdown_notes")

      md_path = os.path.join("markdown_notes", filename)

      editor = os.environ.get('EDITOR', 'nano')
      print(f"\n>> {editor} aciliyor, notunu yaz ve kaydet... ct + O ++ ct + X")
      subprocess.call([editor, md_path])

      if not os.path.exists(md_path):
        print("Hata: Dosya keydedilemedi. islem iptal.")
        return
      
    else:
      note_type = "pdf" if tip_secim == "1" else "image"
      filename = input(f"{note_type.upper()} Dosya Adi (uzantisiyla): ")

      if not os.path.exists(f"uploads/{filename}"):
        print(f"\nUYARI: 'uploads/{filename}'bulunamadi")
        if input("Yine de kaydedilsin mi? (e/h): ").lower() != 'e':
          return
     
    
    new_note = models.Note(
      title=title,
      note_type=note_type,
      file_path=filename,
      content=content,
      course_id=int(course_id)
    )
    db.add(new_note)
    db.commit()
    print(f"\n BASARILI: '{title}' notu sisteme eklendi.")
  except ValueError:
    print("\n HATA: ID kismina sadece sayi girmelisin!")
  except Exception as e:
    print(f"\n BEKLENMEDIK HATA: {e}")
    db.rollback()
  finally:
    db.close()
if __name__ == "__main__":
  start_interactive_add()