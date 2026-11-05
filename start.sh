#!/bin/sh

# Ana site ve admin paneli ayni container icinde ayri portlarda calisir.
# entrypoint.sh init_db.py'yi calistirdiktan sonra bu betigi devralir.

echo "Ana uygulama basliyor (port ${APP_PORT:-8082})..."
uvicorn backend.app.main:app --host 0.0.0.0 --port "${APP_PORT:-8082}" &

echo "Admin paneli basliyor (port ${ADMIN_PORT:-8081})..."
uvicorn backend.app.admin:admin_app --host 0.0.0.0 --port "${ADMIN_PORT:-8081}" &

# Her iki surec de calismaya devam ettikce bekler
wait
