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
RUN chmod +x entrypoint.sh

EXPOSE 8080

ENV PYTHONPATH=/app
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]