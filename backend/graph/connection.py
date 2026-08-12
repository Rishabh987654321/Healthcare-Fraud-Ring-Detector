import os
from pathlib import Path
import environ
from neo4j import GraphDatabase, Driver

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()

env_file = os.path.join(BASE_DIR, '.env')
if os.path.exists(env_file):
    environ.Env.read_env(env_file)

_driver_instance: Driver | None = None


def get_driver() -> Driver:
    """
    Returns a singleton instance of the Neo4j GraphDatabase driver connected to CognoDB.
    Reads COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD from environment variables.
    """
    global _driver_instance
    if _driver_instance is None:
        uri = env('COGNODB_URI', default='')
        user = env('COGNODB_USER', default='')
        password = env('COGNODB_PASSWORD', default='')

        if not uri or not user or not password:
            raise ValueError(
                "Missing CognoDB connection environment variables. "
                "Ensure COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD are configured in backend/.env."
            )

        _driver_instance = GraphDatabase.driver(uri, auth=(user, password))
    return _driver_instance


def close_driver() -> None:
    """
    Closes the active Neo4j driver singleton connection if open.
    """
    global _driver_instance
    if _driver_instance is not None:
        _driver_instance.close()
        _driver_instance = None
