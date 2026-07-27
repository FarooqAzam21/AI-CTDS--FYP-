from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from src.models.models import Alert, APIKey, ScanHistory, User
from src.utils.metrics_collector import metrics


class MonitoringService:
    @staticmethod
    def get_system_snapshot(db, workspace_id) -> Dict[str, Any]:
        alert_count = db.query(Alert).count()
        scan_count = db.query(ScanHistory).count()
        user_count = db.query(User).count()
        recent_alerts = db.query(Alert).filter(
            Alert.workspace_id == workspace_id
        ).order_by(Alert.created_at.desc()).limit(5).all()
        integrations = (
            db.query(APIKey)
            .filter(
                APIKey.workspace_id == workspace_id,
                APIKey.detected_website_url.isnot(None),
            )
            .order_by(APIKey.detected_at.desc())
            .all()
        )
        api_clients = (
            db.query(APIKey)
            .filter(APIKey.workspace_id == workspace_id)
            .order_by(APIKey.last_used.desc())
            .all()
        )
        return {
                "timestamp": datetime.utcnow().isoformat(),
                "metrics": metrics.get_metrics(),
                "counts": {
                    "alerts": alert_count,
                    "scans": scan_count,
                    "users": user_count,
                },
                "recent_alerts": [
                    {
                        "id": str(item.id),
                        "severity": item.severity,
                        "title": item.title,
                        "entity": item.entity,
                    }
                for item in recent_alerts
            ],
            "detected_integrations": [
                {
                    "api_key_id": str(key.id),
                    "api_key_label": key.label,
                    "website_url": key.detected_website_url,
                    "last_detected_at": key.detected_at.isoformat() if key.detected_at else None,
                }
                for key in integrations
            ],
            "api_clients": [
                {
                    "api_key_id": str(key.id),
                    "label": key.label,
                    "last_used": key.last_used.isoformat() if key.last_used else None,
                    "last_used_ip": key.last_used_ip,
                    "successful_requests": key.successful_requests or 0,
                    "failed_requests": key.failed_requests or 0,
                }
                for key in api_clients
            ],
        }
