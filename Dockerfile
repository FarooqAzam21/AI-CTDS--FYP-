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

# Use a shell form so Render's runtime $PORT is expanded. `exec` preserves
# clean signal handling for Uvicorn during deployments and shutdowns.
CMD ["/bin/sh", "-c", "exec uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
