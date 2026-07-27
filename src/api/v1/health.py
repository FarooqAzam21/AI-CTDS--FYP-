from datetime import datetime, timedelta
from fastapi import APIRouter, Response
from src.core.config import settings
from src.core.database import SessionLocal
from src.models.models import AIFeedback, ScanHistory
from src.core.redis_client import check_redis_health
from src.utils.metrics_collector import metrics

router = APIRouter()

@router.get("/health")
async def health_check():
    """Comprehensive health check."""
    redis_health = await check_redis_health()
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        total_scans_24h = db.query(ScanHistory).filter(ScanHistory.created_at >= cutoff).count()
        false_positives_24h = db.query(AIFeedback).filter(
            AIFeedback.created_at >= cutoff,
            AIFeedback.feedback_type == "false_positive",
        ).count()
    finally:
        db.close()

    runtime_metrics = metrics.get_metrics()
    counters = runtime_metrics.get("counters", {})
    cache_hits = counters.get("cache_hits_total", 0)
    cache_misses = counters.get("cache_misses_total", 0)
    cache_total = cache_hits + cache_misses
    scan_timing = runtime_metrics.get("histograms", {}).get("scan_duration_seconds", {})
    
    # In a full implementation, we'd also check DB and Workers
    status = "healthy"
    if redis_health["status"] != "ok" and settings.REDIS_ENABLED:
        status = "degraded"
        
    return {
        "status": status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "services": {
            "database": {"status": "ok"}, # Mocked for now
            "redis": redis_health,
            "workers": {"status": "ok" if settings.CELERY_ENABLED else "disabled"}
        },
        "performance": {
            "total_scans_24h": total_scans_24h,
            "false_positive_rate_24h": false_positives_24h / total_scans_24h if total_scans_24h else None,
            "cache_hit_rate": cache_hits / cache_total if cache_total else None,
            "average_inference_ms": round(scan_timing.get("avg", 0) * 1000, 1) if scan_timing.get("count") else None,
        },
    }

@router.get("/health/live")
def liveness_probe():
    """Fast kubernetes liveness probe."""
    return {"status": "ok"}

@router.get("/health/ready")
def readiness_probe():
    """Kubernetes readiness probe."""
    return {"status": "ok"}

@router.get("/metrics")
def get_metrics(response: Response):
    """Exposes Prometheus text format metrics."""
    response.headers["Content-Type"] = "text/plain; version=0.0.4"
    return metrics.generate_prometheus_format()
