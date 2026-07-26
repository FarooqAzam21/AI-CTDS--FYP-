"""Safely migrate a new or legacy CyberGuard database.

Legacy deployments created their tables through SQLAlchemy's ``create_all``
before Alembic was introduced.  Such databases have no ``alembic_version``
table, so running ``alembic upgrade head`` attempts to create existing tables.
This helper detects that known legacy state, stamps it at revision 004, and
then applies any newer migrations.
"""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from src.core.config import settings


BASELINE_REVISION = "004_login_tracking"
LEGACY_TABLES = {"workspaces", "users", "api_keys", "workspace_users"}


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    config = Config(str(root / "alembic.ini"))
    # Alembic's ConfigParser needs percent signs escaped; SQLAlchemy receives
    # the decoded value when it later reads the option.
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

    engine = create_engine(settings.DATABASE_URL)
    try:
        table_names = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()

    if "alembic_version" not in table_names and table_names:
        missing = LEGACY_TABLES - table_names
        if missing:
            raise RuntimeError(
                "Database has an untracked, incomplete schema. Refusing to "
                f"stamp it as a legacy database; missing tables: {', '.join(sorted(missing))}."
            )
        command.stamp(config, BASELINE_REVISION)

    command.upgrade(config, "head")
    print("Database migrations are up to date.")


if __name__ == "__main__":
    main()
