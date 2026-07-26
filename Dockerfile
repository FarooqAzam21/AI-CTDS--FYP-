# Use official Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Render supplies the public listening port through $PORT (normally 10000).
# 8000 remains the local-development fallback.
EXPOSE 10000

# Set environment variables
ENV PYTHONPATH=.
ENV PYTHONUNBUFFERED=1

# Apply pending schema changes before serving traffic. The migration helper
# also handles legacy databases that predate Alembic version tracking.
# `exec` preserves clean signal handling for Uvicorn during shutdowns.
CMD ["/bin/sh", "-c", "python -m src.scripts.migrate_database && exec uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
