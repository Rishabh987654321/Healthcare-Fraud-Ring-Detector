import os
import logging
from pathlib import Path
import environ
from neo4j import GraphDatabase, Driver

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()

env_file = os.path.join(BASE_DIR, '.env')
if os.path.exists(env_file):
    environ.Env.read_env(env_file)

_driver_instance: Driver | None = None


def get_driver() -> Driver:
    """
    Returns a true singleton instance of the Neo4j GraphDatabase driver connected to CognoDB.
    Configures connection pool parameters:
    - max_connection_lifetime = 3600 (1 hour)
    - max_connection_pool_size = 50
    - connection_acquisition_timeout = 30
    Reuses the single connection pool across all per-request sessions.
    """
    global _driver_instance
    if _driver_instance is None:
        uri = env('COGNODB_URI', default='')
        user = env('COGNODB_USER', default='')
        password = env('COGNODB_PASSWORD', default='')

        if not uri or not user or not password:
            raise ValueError(
                "Missing CognoDB connection environment variables. "
                "Ensure COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD are configured."
            )

        logger.info("[COGNODB] Initializing Neo4j GraphDatabase driver singleton pool...")
        _driver_instance = GraphDatabase.driver(
            uri,
            auth=(user, password),
            max_connection_lifetime=3600,
            max_connection_pool_size=50,
            connection_acquisition_timeout=30,
        )
    return _driver_instance


def close_driver() -> None:
    """
    Closes the active Neo4j driver singleton connection pool if open.
    """
    global _driver_instance
    if _driver_instance is not None:
        logger.info("[COGNODB] Closing Neo4j GraphDatabase driver singleton pool...")
        _driver_instance.close()
        _driver_instance = None
