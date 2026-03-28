#!/bin/sh

# 1. Veritabanini kontrol et ve gerekirse olustur/guncelle
echo "Veritabani baslatiliyor (init_db.py calmali)..."
python init_db.py

# 2. Ana uygulamayi (Uvicorn) baslat
# Dockerfile uzerindeki CMD kismindaki dizilimi "exec" ile devralir
echo "Uygulama basliyor..."
exec "$@"
