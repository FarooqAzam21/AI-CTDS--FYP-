"""Record browser websites automatically detected for API keys.

Revision ID: 006_detect_api_integrations
Revises: 005_api_key_integrations
"""

from alembic import op
import sqlalchemy as sa


revision = "006_detect_api_integrations"
down_revision = "005_api_key_integrations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("detected_website_url", sa.String(), nullable=True))
    op.add_column("api_keys", sa.Column("detected_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("api_keys", "detected_at")
    op.drop_column("api_keys", "detected_website_url")
