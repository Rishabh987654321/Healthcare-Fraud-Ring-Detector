"""
Business logic services layer for graph API endpoints.
Encapsulates Cypher calls in queries.py and formats outputs matching the API contract.
"""

from typing import List, Dict, Any, Optional
from neo4j import Driver
from django.core.cache import cache
from graph import queries

FRAUD_RINGS_CACHE_KEY = "fraud_rings_combined"
FRAUD_RINGS_CACHE_TTL = 300  # 5 minutes — static seed dataset in demo context


def service_search_entities(driver: Driver, query: str, entity_type: str = "all") -> Dict[str, List[Dict[str, Any]]]:
    """
    Executes entity search and returns formatted results object.
    """
    results = queries.search_entities(driver, query, entity_type)
    return {"results": results}


def service_get_entity_detail(driver: Driver, entity_type: str, entity_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves full detail dictionary for a specific provider or patient.
    """
    return queries.get_entity_detail(driver, entity_type, entity_id)


def service_get_entity_network(driver: Driver, entity_type: str, entity_id: str, depth: int = 2) -> Dict[str, Any]:
    """
    Retrieves force-directed graph node and edge network centered at entity_id.
    """
    return queries.get_entity_network(driver, entity_type, entity_id, depth)


def service_get_fraud_rings(driver: Driver) -> Dict[str, List[Dict[str, Any]]]:
    """
    Combines detected Ring A (shared address) and Ring B (billing outlier) rings.
    Caches combined results for 5 minutes to avoid repeating expensive Cypher scans
    when the Flagged Rings tab is accessed repeatedly.
    """
    cached = cache.get(FRAUD_RINGS_CACHE_KEY)
    if cached is not None:
        return cached

    ring_a_rings = queries.find_shared_address_rings(driver)
    ring_b_rings = queries.find_billing_outlier_rings(driver)
    result = {"rings": ring_a_rings + ring_b_rings}

    # Note: TTL-based caching is appropriate here because seed data is static after seeding.
    # A production pipeline with continuous ingestion would require explicit cache invalidation.
    cache.set(FRAUD_RINGS_CACHE_KEY, result, FRAUD_RINGS_CACHE_TTL)
    return result
