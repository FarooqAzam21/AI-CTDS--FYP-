"""
Background task scheduler for prevention system
Handles automated cleanup and maintenance tasks
"""

import asyncio
import logging
from datetime import datetime, timedelta
from src.core.database import SessionLocal
from src.services.prevention_engine import PreventionEngine
from src.models.models import APIKey
from src.services.website_monitoring_service import WebsiteMonitoringService

logger = logging.getLogger(__name__)


class PreventionScheduler:
    """
    Scheduler for automated prevention system maintenance tasks
    """
    
    @staticmethod
    async def cleanup_expired_blocks_task():
        """
        Scheduled task to cleanup expired blocks (runs every 5 minutes)
        """
        while True:
            try:
                db = SessionLocal()
                cleaned_count = PreventionEngine.cleanup_expired_blocks(db)
                db.close()
                
                if cleaned_count > 0:
                    logger.info(f"Cleanup task: Unblocked {cleaned_count} expired entities")
                
                # Run every 5 minutes
                await asyncio.sleep(300)
            except Exception as e:
                logger.error(f"Cleanup task error: {e}")
                # Retry after 5 minutes even if there's an error
                await asyncio.sleep(300)

    @staticmethod
    async def scheduled_website_scans_task():
        """Run only website scans explicitly approved by a workspace admin."""
        while True:
            db = None
            try:
                db = SessionLocal()
                now = datetime.utcnow()
                due_keys = db.query(APIKey).filter(
                    APIKey.is_active == True,
                    APIKey.website_monitoring_enabled == True,
                    APIKey.website_url.isnot(None),
                    APIKey.next_website_scan_at <= now,
                ).all()
                for key in due_keys:
                    try:
                        await WebsiteMonitoringService.scan(db, key)
                    except Exception as error:
                        logger.error(f"Scheduled website scan failed for API key {key.id}: {error}")
                await asyncio.sleep(300)
            except Exception as error:
                logger.error(f"Scheduled website scan task error: {error}")
                await asyncio.sleep(300)
            finally:
                if db:
                    db.close()
    
    @staticmethod
    async def start_scheduler():
        """
        Start all background scheduler tasks
        Should be called during application startup
        """
        try:
            logger.info("Starting prevention system scheduler...")
            # Create background task
            asyncio.create_task(PreventionScheduler.cleanup_expired_blocks_task())
            asyncio.create_task(PreventionScheduler.scheduled_website_scans_task())
            logger.info("Prevention scheduler started successfully")
        except Exception as e:
            logger.error(f"Failed to start prevention scheduler: {e}")
