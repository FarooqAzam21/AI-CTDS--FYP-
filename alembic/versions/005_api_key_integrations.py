"""Store identifying details for API-key integrations.

Revision ID: 005_api_key_integrations
Revises: 004_login_tracking
"""

from alembic import op
import sqlalchemy as sa


revision = "005_api_key_integrations"
down_revision = "004_login_tracking"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("integration_name", sa.String(), nullable=True))
    op.add_column("api_keys", sa.Column("website_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("api_keys", "website_url")
    op.drop_column("api_keys", "integration_name")
