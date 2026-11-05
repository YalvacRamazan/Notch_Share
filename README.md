# Notch_Share

Yönetim Bilişim Sistemleri dersleri için not arşivi. Ders notları, dokümanlar, bağlantılar ve sınav tarihleri tek bir web uygulamasında toplanır. İçerik eklemek ve güncellemek için aynı container içinde, ayrı portta çalışan bir yönetim paneli bulunur.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?logo=docker&logoColor=white)

## Özellikler

- Ders listesi ve ders detay sayfaları
- İçerik türleri: Markdown notu, düz metin, bağlantı, PDF ve görsel
- Ders bazlı vize ve final tarihleri, ana sayfada sınav takvimi penceresi
- Markdown dosyaları diskten okunur, tarayıcıda gösterilmeden önce istemci tarafında izinli etiketlere göre filtrelenir
- Yönetim paneli: ders ve içerik ekleme, düzenleme, silme, dosya yükleme

## Portlar

| Uygulama | Container portu | Varsayılan host portu |
|----------|-----------------|-----------------------|
| Ana site | 8082 | 8082 |
| Admin paneli | 8081 | 8081 |

## Docker ile çalıştırma

1. Proje kökünde `.env` dosyası oluşturun:

```env
HOST_PORT=8082
ADMIN_HOST_PORT=8081
ADMIN_SESSION_SECRET=<openssl rand -hex 32 çıktısı>
ADMIN_USERNAME=rumata
ADMIN_PASSWORD=<güçlü bir parola>
```

2. Uygulamayı başlatın:

```bash
docker compose up --build -d
```

3. Tarayıcıdan açın:

- Ana site: `http://localhost:8082`
- Admin paneli: `http://localhost:8081/admin`

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `HOST_PORT` | `8082` | Ana sitenin host portu |
| `ADMIN_HOST_PORT` | `8081` | Admin panelinin host portu |
| `ADMIN_SESSION_SECRET` | (rastgele) | Oturum çerezlerini imzalayan anahtar. Boş bırakılırsa her yeniden başlatmada oturumlar sıfırlanır |
| `ADMIN_USERNAME` | `rumata` | İlk kurulumda oluşturulan admin kullanıcı adı |
| `ADMIN_PASSWORD` | `rumata1!` | İlk kurulumda oluşturulan admin parolası |
| `DATABASE_PATH` | `./ybs_notlar.db` | SQLite veritabanı yolu (compose içinde `/app/data/ybs_notlar.db`) |

## Yerel geliştirme

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python init_db.py

uvicorn backend.app.main:app --reload                      # ana site, 8082
uvicorn backend.app.admin:admin_app --port 8081 --reload   # admin paneli, 8081
```

## Admin paneli

- Giriş sayfası `/admin`, panel `/admin/panel` adresindedir
- Giriş bilgileri `admins` tablosunda bcrypt ile doğrulanır
- Oturum çerezi HMAC ile imzalanır ve 8 saat geçerlidir
- 5 hatalı girişten sonra IP 5 dakika boyunca bloklanır
- İlk kurulumda oluşan varsayılan parolayı değiştirin
- Cloudflared Access gibi bir kimlik katmanı kullanıyorsanız 8081 portunu tunnel üzerinden korumaya alın. `ADMIN_COOKIE_SECURE=true` ayarı çerezi yalnızca HTTPS bağlantılarında gönderir

## Komut satırı araçları

- `python init_db.py`: tabloları oluşturur, örnek dersleri ve admin hesabını ekler
- `python add_note.py`: etkileşimli olarak ders seçip not, doküman veya bağlantı ekler

## Proje yapısı

```
backend/app/main.py      ana site API'si (port 8082)
backend/app/admin.py     admin paneli API'si (port 8081)
backend/app/db/          SQLAlchemy modelleri ve veritabanı bağlantısı
frontend/static/         ana site arayüzü
frontend/admin/          admin paneli arayüzü
markdown_notes/          ders bazlı markdown dosyaları
uploads/                 ders bazlı yüklenen dosyalar
```

## API

| Metot | Yol | Açıklama |
|-------|-----|----------|
| GET | `/api/courses` | Ders listesi |
| GET | `/api/courses/{id}/notes` | Bir dersin tüm içerikleri |

Admin işlemleri `/admin/api/...` altındadır ve oturum gerektirir.

## Bağlantı

Depo: [github.com/YalvacRamazan/Notch_Share](https://github.com/YalvacRamazan/Notch_Share)
