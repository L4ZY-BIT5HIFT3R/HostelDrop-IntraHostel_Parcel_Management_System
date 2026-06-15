# HostelDrop backend (FastAPI + Uvicorn) production image.
# Build context is the repo root so the app runs as `backend.server:app`.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first for better layer caching.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the application code.
COPY backend ./backend

# Render (and most platforms) inject $PORT; default to 8001 for local runs.
ENV PORT=8001
EXPOSE 8001

# Run as a non-root user.
RUN useradd --create-home --uid 10001 appuser
USER appuser

CMD ["sh", "-c", "uvicorn backend.server:app --host 0.0.0.0 --port ${PORT:-8001}"]
