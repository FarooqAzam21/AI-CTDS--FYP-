"""Add owner-approved website monitoring schedules.

Revision ID: 007_website_monitoring
Revises: 006_detect_api_integrations
"""

from alembic import op
import sqlalchemy as sa


revision = "007_website_monitoring"
down_revision = "006_detect_api_integrations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("website_monitoring_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("api_keys", sa.Column("monitoring_interval_hours", sa.Integer(), nullable=True))
    op.add_column("api_keys", sa.Column("last_website_scan_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("api_keys", sa.Column("next_website_scan_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("api_keys", sa.Column("last_website_scan_verdict", sa.String(), nullable=True))
    op.add_column("api_keys", sa.Column("last_website_scan_score", sa.Integer(), nullable=True))


def downgrade() -> None:
    for column in ("last_website_scan_score", "last_website_scan_verdict", "next_website_scan_at", "last_website_scan_at", "monitoring_interval_hours", "website_monitoring_enabled"):
        op.drop_column("api_keys", column)
