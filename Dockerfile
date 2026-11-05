FROM python:3.11-slim

WORKDIR /app

# Venv olustur ve yolu PATH'e ekle
#Sunucuda calisacaksa yorum satirina alin
RUN apt-get update && apt-get install -y nano vim && rm -rf /var/lib/apt/lists/*
RUN python -m venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh start.sh

# 8082: ana site, 8081: admin paneli
EXPOSE 8082 8081

ENV PYTHONPATH=/app
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh", "/app/start.sh"]
