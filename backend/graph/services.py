"""
Business logic services layer for graph API endpoints.
Encapsulates Cypher calls in queries.py and formats outputs matching the API contract.
"""

from typing import List, Dict, Any, Optional
from neo4j import Driver
from graph import queries


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
    """
    ring_a_rings = queries.find_shared_address_rings(driver)
    ring_b_rings = queries.find_billing_outlier_rings(driver)

    all_rings = ring_a_rings + ring_b_rings
    return {"rings": all_rings}
