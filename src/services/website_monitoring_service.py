"""Owner-approved website scan execution used by manual and scheduled monitoring."""

from __future__ import annotations

from datetime import datetime, timedelta
from urllib.parse import urlparse

from fastapi import HTTPException

from src.agent.orchestrator import SecurityAgent
from src.models.models import APIKey, ScanHistory, Workspace
from src.services.threat_intel import ThreatIntelService
from src.utils.correlation import CorrelationEngine


class WebsiteMonitoringService:
    @staticmethod
    def validate_url(value: str) -> str:
        parsed = urlparse(value.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise HTTPException(400, "Website URL must be a complete http or https URL.")
        if parsed.hostname.lower() == "localhost" or parsed.hostname.startswith("127."):
            raise HTTPException(400, "Localhost URLs cannot be monitored.")
        return parsed.geturl()

    @staticmethod
    async def scan(db, key: APIKey) -> dict:
        if not key.website_url:
            raise HTTPException(400, "Approve a website URL before running a scan.")
        workspace = db.query(Workspace).filter(Workspace.id == key.workspace_id).first()
        if not workspace:
            raise HTTPException(404, "Workspace for this API key was not found.")

        website_url = WebsiteMonitoringService.validate_url(key.website_url)
        result = await SecurityAgent(tenant_id=str(workspace.id)).analyze_payload(
            db, {"type": "url", "data": website_url}, workspace=workspace, user_id=None
        )
        entities = result.get("entities") or CorrelationEngine.extract_entities("url", website_url)
        top_vector = max(result.get("vector_details", []), key=lambda item: item.get("confidence", 0), default={})
        prevention = result.get("prevention") or {}
        scan = ScanHistory(
            workspace_id=workspace.id,
            user_id=None,
            input_type="url",
            entity=ThreatIntelService.normalize_entity(entities[0] if entities else website_url),
            entities=entities,
            attack_type=result.get("attack_type") or top_vector.get("attack_type"),
            severity=result.get("severity") or top_vector.get("severity"),
            ml_confidence=int(top_vector.get("confidence", 0)),
            intelligence_hit=bool(result.get("intelligence", {}).get("threat_intel")),
            correlation_hit=bool(result.get("intelligence", {}).get("correlation", {}).get("detected")),
            prevention_triggered=bool(prevention and prevention.get("alert")),
            risk_score=result["agent_verdict"]["score"],
            verdict=result["agent_verdict"]["label"],
            explanation=result.get("explanation") or {},
            mitre_mappings=result.get("mitre_mappings") or [],
            details=result,
        )
        db.add(scan)
        now = datetime.utcnow()
        key.last_website_scan_at = now
        key.last_website_scan_verdict = result["agent_verdict"]["label"]
        key.last_website_scan_score = result["agent_verdict"]["score"]
        key.next_website_scan_at = now + timedelta(hours=key.monitoring_interval_hours or 24) if key.website_monitoring_enabled else None
        db.commit()
        result["scan_id"] = str(scan.id)
        return result
