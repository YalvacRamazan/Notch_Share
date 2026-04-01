import subprocess
import os
from backend.app.db.database import SessionLocal
from backend.app.db import models

import getpass
import bcrypt

def start_interactive_add():
  db = SessionLocal()
  try:
    print("="*30)
    print(" YBS NOTCH Yonetici Girisi ")
    print("="*30)
    username = input("Kullanici Adi: ")
    password = getpass.getpass("Parola: ")
    
    admin = db.query(models.Admin).filter(models.Admin.username == username).first()
    if not admin or not bcrypt.checkpw(password.encode('utf-8'), admin.password_hash.encode('utf-8')):
      print(" HATA: Yetkisiz giris. Kullanici adi veya parola yanlis!")
      return
    print(" Basariyla giris yapildi.\n")

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

    course_id_input = input("Islem yapmak istediginiz DERS ID' sini yazin: ").strip()
    try:
      course_id_int = int(course_id_input)
    except ValueError:
       print("\n HATA: ID kismina sadece sayi girmelisin!")
       return

    course = db.query(models.Course).filter(models.Course.id == course_id_int).first()
    if not course:
       print(f"\n HATA: {course_id_int} ID'li bir ders bulunamadi!")
       return

    print(f"\nSecilen Ders: {course.name}")
    print("[1] Yeni Not / Dokuman / Link Ekle")
    print("[2] Vize / Final Tarihi Guncelle")
    ana_secim = input("Islem Seciniz (1/2): ").strip()

    if ana_secim == "2":
      print(f"\n--- {course.name} Icin Sinav Tarihleri ---")
      vize = input(f"Vize Tarihi (Mevcut: {course.vize_date or 'Yok'}): ").strip()
      final = input(f"Final Tarihi (Mevcut: {course.final_date or 'Yok'}): ").strip()
      
      # Basit XSS onlemi ve input uzunlugu kontrolu
      if vize:
        if len(vize) > 50 or '<' in vize or '>' in vize:
           print("HATA: Gecersiz veya zararli format!")
           return
        course.vize_date = vize
      if final:
        if len(final) > 50 or '<' in final or '>' in final:
           print("HATA: Gecersiz veya zararli format!")
           return
        course.final_date = final
        
      db.commit()
      print("\n BASARILI: Tarihler guncellendi!")
      return

    elif ana_secim == "1":
      title = input("Not icin bir BASLIK gir (ORN: Hafta 1 Ozet): ").strip()
      if '<' in title or '>' in title:
         print("HATA: Baslik zararli karakterler iceremez!")
         return
         
      print("\nNot Tipi: [1] PDF, [2] Resim, [3] Sadece Metin, [4] Markdown (Editor Acilir), [5] Link (URL)")
      tip_secim = input("Seciminiz (1/2/3/4/5): ").strip()
  
      note_type = "pdf"
      filename = None
      content = None
  
      if tip_secim == "3":
        note_type = "text"
        content = input("Not icerigini buraya yazin: ")
  
      elif tip_secim == "5":
        note_type = "link"
        content = input("Baglanti (URL) adresini girin (orn: https://...): ").strip()
        if javascript_check := content.lower().startswith("javascript:"):
           print("HATA: javascript: URI link kullanimi xss acigidir!")
           return
  
      elif tip_secim == "4":
        note_type = "markdown"
        filename = input("Markdown dosya adi (orn: not.md): ")
  
        md_dir = os.path.join("markdown_notes", course.slug)
        if not os.path.exists(md_dir):
          os.makedirs(md_dir)
  
        md_path = os.path.join(md_dir, filename)
  
        import shutil
        
        # Kullanicinin ortam degiskeninde belirtmis olabilecegi editoru alalim
        editor = os.environ.get('EDITOR')
        
        # Eger EDITOR tanimli degilse veya kurulu degilse, sirayla kurulu olanlari deneyelim
        if not editor or not shutil.which(editor):
          for e in ['nano', 'vim', 'vi']:
            if shutil.which(e):
              editor = e
              break
              
        if not editor:
          print("\n[HATA] Sisteminizde vim, vi veya nano gibi bir metin editoru bulunamadi.")
          if input("Daha sonra manuel olarak eklemek uzere bos bir dosya olusturulsun mu? (e/h): ").lower() == 'e':
            open(md_path, 'w').close()
            print(f"Bos dosya olusturuldu: {md_path}")
          return
  
        kisa_yol = ":wq" if editor in ["vim", "vi"] else "Ctrl+O ardindan Ctrl+X"
        print(f"\n>> {editor} aciliyor, notunu yaz ve kaydet... ({kisa_yol})")
        subprocess.call([editor, md_path])
  
        if not os.path.exists(md_path):
          print("Hata: Dosya keydedilemedi. islem iptal.")
          return
        
      else:
        note_type = "pdf" if tip_secim == "1" else "image"
        filename = input(f"{note_type.upper()} Dosya Adi (uzantisiyla): ")
  
        upl_dir = os.path.join("uploads", course.slug)
        if not os.path.exists(os.path.join(upl_dir, filename)):
          print(f"\nUYARI: '{upl_dir}/{filename}' bulunamadi")
          if input("Yine de kaydedilsin mi? (e/h): ").lower() != 'e':
            return
       
      
      new_note = models.Note(
        title=title,
        note_type=note_type,
        file_path=filename,
        content=content,
        course_id=course.id
      )
      db.add(new_note)
      db.commit()
      print(f"\n BASARILI: '{title}' notu sisteme eklendi.")
    else:
      print("Gecersiz secim!")
  except Exception as e:
    print(f"\n BEKLENMEDIK HATA: {e}")
    db.rollback()
  finally:
    db.close()
if __name__ == "__main__":
  start_interactive_add()