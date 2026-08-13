"""
Named parameterized Cypher queries for CognoDB.
All database queries use parameterized Cypher to prevent string concatenation vulnerabilities.
"""

from typing import List, Dict, Any, Optional
from neo4j import Driver


def create_constraints(driver: Driver) -> None:
    """
    Creates uniqueness constraints for graph node identifiers in CognoDB.
    Uses IF NOT EXISTS to guarantee idempotency.
    """
    constraints = [
        "CREATE CONSTRAINT patient_id IF NOT EXISTS FOR (p:Patient) REQUIRE p.id IS UNIQUE",
        "CREATE CONSTRAINT provider_id IF NOT EXISTS FOR (p:Provider) REQUIRE p.id IS UNIQUE",
        "CREATE CONSTRAINT claim_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE",
        "CREATE CONSTRAINT procedure_code IF NOT EXISTS FOR (p:Procedure) REQUIRE p.code IS UNIQUE",
    ]

    with driver.session() as session:
        for constraint_query in constraints:
            try:
                session.run(constraint_query)
            except Exception as e:
                print(f"[create_constraints] Warning executing '{constraint_query}': {e}")


def search_entities(driver: Driver, query: str, entity_type: str = "all") -> List[Dict[str, Any]]:
    """
    Searches for providers or patients matching the query string in name, id, npi,
    or dob. An empty query returns a browsable, alphabetically-ordered list
    instead of no results.
    """
    results = []
    clean_query = query.strip()

    with driver.session() as session:
        if entity_type in ["provider", "all"]:
            if clean_query:
                prov_cypher = """
                MATCH (p:Provider)
                WHERE toLower(p.name) CONTAINS toLower($query_str)
                   OR toLower(p.id) CONTAINS toLower($query_str)
                   OR toLower(p.npi) CONTAINS toLower($query_str)
                RETURN p.id AS id, 'provider' AS type, p.name AS name,
                       p.specialty AS specialty, p.npi AS npi
                ORDER BY p.name
                LIMIT 20
                """
                prov_params = {"query_str": clean_query}
            else:
                prov_cypher = """
                MATCH (p:Provider)
                RETURN p.id AS id, 'provider' AS type, p.name AS name,
                       p.specialty AS specialty, p.npi AS npi
                ORDER BY p.name
                LIMIT 20
                """
                prov_params = {}
            results.extend(session.run(prov_cypher, parameters=prov_params).data())

        if entity_type in ["patient", "all"]:
            if clean_query:
                pat_cypher = """
                MATCH (p:Patient)
                WHERE toLower(p.name) CONTAINS toLower($query_str)
                   OR toLower(p.id) CONTAINS toLower($query_str)
                RETURN p.id AS id, 'patient' AS type, p.name AS name, p.dob AS dob
                ORDER BY p.name
                LIMIT 20
                """
                pat_params = {"query_str": clean_query}
            else:
                pat_cypher = """
                MATCH (p:Patient)
                RETURN p.id AS id, 'patient' AS type, p.name AS name, p.dob AS dob
                ORDER BY p.name
                LIMIT 20
                """
                pat_params = {}
            results.extend(session.run(pat_cypher, parameters=pat_params).data())

    return results


def get_entity_detail(driver: Driver, entity_type: str, entity_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches full metadata for a provider or patient entity, including address, phone, and claims.
    """
    with driver.session() as session:
        if entity_type == "provider":
            cypher = """
            MATCH (p:Provider {id: $id})
            OPTIONAL MATCH (p)-[:LOCATED_AT]->(a:Address)
            OPTIONAL MATCH (p)-[:HAS_PHONE]->(ph:Phone)
            OPTIONAL MATCH (c:Claim)-[:BILLED_BY]->(p)
            OPTIONAL MATCH (pat:Patient)-[:SUBMITTED]->(c)
            OPTIONAL MATCH (c)-[:FOR_PROCEDURE]->(proc:Procedure)
            WITH p, a, ph, c, proc
            ORDER BY c.date DESC
            WITH p, a, ph, collect(DISTINCT {
                id: c.id,
                date: c.date,
                amount: c.amount,
                status: c.status,
                procedureCode: proc.code,
                procedureDescription: proc.description
            }) AS claims_raw
            RETURN p.id AS id, 'provider' AS type, p.name AS name, p.specialty AS specialty, p.npi AS npi,
                   a, ph, [c IN claims_raw WHERE c.id IS NOT NULL] AS claims
            """
        elif entity_type == "patient":
            cypher = """
            MATCH (p:Patient {id: $id})
            OPTIONAL MATCH (p)-[:LOCATED_AT]->(a:Address)
            OPTIONAL MATCH (p)-[:HAS_PHONE]->(ph:Phone)
            OPTIONAL MATCH (p)-[:SUBMITTED]->(c:Claim)
            OPTIONAL MATCH (c)-[:FOR_PROCEDURE]->(proc:Procedure)
            WITH p, a, ph, c, proc
            ORDER BY c.date DESC
            WITH p, a, ph, collect(DISTINCT {
                id: c.id,
                date: c.date,
                amount: c.amount,
                status: c.status,
                procedureCode: proc.code,
                procedureDescription: proc.description
            }) AS claims_raw
            RETURN p.id AS id, 'patient' AS type, p.name AS name, p.dob AS dob,
                   a, ph, [c IN claims_raw WHERE c.id IS NOT NULL] AS claims
            """
        else:
            return None

        records = session.run(cypher, parameters={"id": entity_id}).data()
        if not records:
            return None

        rec = records[0]

        address = None
        if rec.get("a"):
            a_node = rec["a"]
            address = {
                "line1": a_node.get("line1", ""),
                "city": a_node.get("city", ""),
                "state": a_node.get("state", ""),
                "zip": a_node.get("zip", "")
            }

        phone = None
        if rec.get("ph"):
            ph_node = rec["ph"]
            phone = {
                "number": ph_node.get("number", "")
            }

        result = {
            "id": rec["id"],
            "type": rec["type"],
            "name": rec["name"],
            "address": address,
            "phone": phone,
            "claims": rec.get("claims", [])
        }

        if entity_type == "provider":
            result["specialty"] = rec.get("specialty", "")
            result["npi"] = rec.get("npi", "")
        else:
            result["dob"] = rec.get("dob", "")

        return result


def find_shared_address_rings(driver: Driver) -> List[Dict[str, Any]]:
    """
    Detects Ring A pattern: 2 or more providers sharing an Address, billing the same rare procedure
    for an overlapping set of shared patients.
    """
    cypher = """
    MATCH (pr1:Provider)-[:LOCATED_AT]->(a:Address)<-[:LOCATED_AT]-(pr2:Provider)
    WHERE pr1.id < pr2.id
    MATCH (c1:Claim)-[:BILLED_BY]->(pr1), (c1)-[:FOR_PROCEDURE]->(proc:Procedure {is_rare: true})
    MATCH (c2:Claim)-[:BILLED_BY]->(pr2), (c2)-[:FOR_PROCEDURE]->(proc)
    MATCH (pat:Patient)-[:SUBMITTED]->(c1), (pat)-[:SUBMITTED]->(c2)
    WITH a, proc, collect(DISTINCT pr1) + collect(DISTINCT pr2) AS raw_providers, count(DISTINCT pat) AS patient_cnt
    WHERE size(raw_providers) >= 2 AND patient_cnt >= 5
    UNWIND raw_providers AS p
    WITH a, proc, patient_cnt, collect(DISTINCT {id: p.id, name: p.name}) AS unique_providers
    RETURN a.id AS address_id, (a.line1 + ', ' + a.city + ', ' + a.state) AS address_label,
           proc.code AS proc_code, proc.description AS proc_desc,
           unique_providers AS providers, patient_cnt
    """
    rings = []
    with driver.session() as session:
        records = session.run(cypher).data()
        for idx, rec in enumerate(records):
            ring_id = f"ring-a-{rec['address_id'].lower()}-{rec['proc_code'].lower()}"
            rings.append({
                "id": ring_id,
                "kind": "shared_address_procedure",
                "sharedNode": {
                    "type": "address",
                    "id": rec["address_id"],
                    "label": rec["address_label"]
                },
                "procedure": {
                    "code": rec["proc_code"],
                    "description": rec["proc_desc"]
                },
                "providers": rec["providers"],
                "patientCount": rec["patient_cnt"],
                "severity": "high"
            })
    return rings


def find_billing_outlier_rings(driver: Driver) -> List[Dict[str, Any]]:
    """
    Detects Ring B pattern: Provider billing 4x+ the specialty average for a procedure,
    plus sharing a Phone node with other providers.
    """
    cypher_avg = """
    MATCH (c:Claim)-[:BILLED_BY]->(pr:Provider), (c)-[:FOR_PROCEDURE]->(proc:Procedure)
    WITH pr.specialty AS specialty, proc.code AS proc_code, pr, count(c) AS provider_claim_count
    RETURN specialty, proc_code, avg(toInteger(provider_claim_count)) AS spec_avg
    """

    cypher_outliers = """
    MATCH (c:Claim)-[:BILLED_BY]->(pr:Provider), (c)-[:FOR_PROCEDURE]->(proc:Procedure)
    OPTIONAL MATCH (pr)-[:HAS_PHONE]->(ph:Phone)
    WITH pr, proc, ph, count(c) AS claim_count
    WHERE claim_count >= 50
    RETURN pr.id AS provider_id, pr.name AS provider_name, pr.specialty AS specialty,
           proc.code AS proc_code, proc.description AS proc_desc,
           ph.id AS phone_id, ph.number AS phone_label, claim_count
    """

    rings = []
    with driver.session() as session:
        avg_records = session.run(cypher_avg).data()
        avg_map = {}
        for r in avg_records:
            key = f"{r['specialty']}::{r['proc_code']}"
            avg_map[key] = r["spec_avg"]

        outlier_records = session.run(cypher_outliers).data()
        for rec in outlier_records:
            key = f"{rec['specialty']}::{rec['proc_code']}"
            spec_avg = round(avg_map.get(key, 20.0), 1)

            if rec["claim_count"] >= (3.5 * spec_avg):
                ring_id = f"ring-b-{rec['provider_id'].lower()}-{rec['proc_code'].lower()}"
                rings.append({
                    "id": ring_id,
                    "kind": "billing_outlier",
                    "sharedNode": {
                        "type": "phone",
                        "id": rec.get("phone_id") or "PHONE-UNKNOWN",
                        "label": rec.get("phone_label") or "Unlisted Phone"
                    },
                    "procedure": {
                        "code": rec["proc_code"],
                        "description": rec["proc_desc"]
                    },
                    "providers": [
                        {
                            "id": rec["provider_id"],
                            "name": rec["provider_name"],
                            "claimCount": rec["claim_count"],
                            "specialtyAvg": spec_avg
                        }
                    ],
                    "severity": "medium"
                })

    return rings


from django.core.cache import cache

FLAGGED_IDS_CACHE_KEY = "flagged_node_ids"
FLAGGED_IDS_CACHE_TTL = 300  # 5 minutes — static seed dataset in demo context


def get_flagged_node_ids(driver: Driver) -> set:
    """
    Returns set of all node IDs (providers, addresses, phones) that are part of detected fraud rings.
    Uses Django LocMemCache with a 5-minute TTL to avoid re-running expensive
    multi-hop ring scans on every /network/ call.
    """
    cached = cache.get(FLAGGED_IDS_CACHE_KEY)
    if cached is not None:
        return cached

    flagged_ids = set()
    ring_a_list = find_shared_address_rings(driver)
    for ring in ring_a_list:
        flagged_ids.add(ring["sharedNode"]["id"])
        for p in ring["providers"]:
            flagged_ids.add(p["id"])

    ring_b_list = find_billing_outlier_rings(driver)
    for ring in ring_b_list:
        if ring["sharedNode"]["id"]:
            flagged_ids.add(ring["sharedNode"]["id"])
        for p in ring["providers"]:
            flagged_ids.add(p["id"])

    # Note: TTL-based caching is appropriate here because seed data is static after seeding.
    # A production pipeline with continuous ingestion would require explicit cache invalidation.
    cache.set(FLAGGED_IDS_CACHE_KEY, flagged_ids, FLAGGED_IDS_CACHE_TTL)
    return flagged_ids


def get_entity_network(driver: Driver, entity_type: str, entity_id: str, depth: int = 2) -> Dict[str, Any]:
    """
    Traverses graph network starting at entity_id up to depth (1..3).
    Returns nodes and edges, flagging nodes that participate in fraud rings.
    """
    safe_depth = max(1, min(3, depth))
    flagged_ids = get_flagged_node_ids(driver)
    label = "Provider" if entity_type == "provider" else "Patient"

    nodes_cypher = f"""
    MATCH (start:{label} {{id: $id}})
    MATCH path = (start)-[*1..{safe_depth}]-(connected)
    UNWIND nodes(path) AS n
    RETURN DISTINCT n
    """

    edges_cypher = f"""
    MATCH (start:{label} {{id: $id}})
    MATCH path = (start)-[*1..{safe_depth}]-(connected)
    UNWIND relationships(path) AS rel
    RETURN DISTINCT startNode(rel) AS s, endNode(rel) AS e, type(rel) AS rel_type
    """

    root_cypher = f"MATCH (start:{label} {{id: $id}}) RETURN start"

    def classify_node(node_id: str, props: dict) -> tuple[str, str]:
        if node_id.startswith("PRV-"):
            return "provider", props.get("name", node_id)
        if node_id.startswith("PAT-"):
            return "patient", props.get("name", node_id)
        if node_id.startswith("ADDR-"):
            return "address", f"{props.get('line1', '')}, {props.get('city', '')}"
        if node_id.startswith("PHONE-"):
            return "phone", props.get("number", node_id)
        if node_id.startswith("CPT-"):
            return "procedure", f"{node_id}: {props.get('description', '')}"
        if node_id.startswith("CLM-"):
            return "claim", f"Claim {node_id} (${props.get('amount', 0)})"
        return "unknown", node_id

    def node_to_dict(node) -> Optional[Dict[str, Any]]:
        props = dict(node.items())
        node_id = props.get("id") or props.get("code")
        if not node_id:
            return None
        node_type, node_label = classify_node(node_id, props)
        return {
            "id": node_id,
            "label": node_label,
            "type": node_type,
            "flagged": node_id in flagged_ids,
        }

    nodes_dict: Dict[str, Dict[str, Any]] = {}
    edges_set = set()

    with driver.session() as session:
        # Root node — always included even if it has zero connections.
        root_result = session.run(root_cypher, parameters={"id": entity_id})
        root_record = root_result.single()
        if root_record:
            root_dict = node_to_dict(root_record["start"])
            if root_dict:
                nodes_dict[root_dict["id"]] = root_dict

        # Nodes — iterate the raw Result, NOT .data(), to keep real Node objects.
        for record in session.run(nodes_cypher, parameters={"id": entity_id}):
            node_dict = node_to_dict(record["n"])
            if node_dict and node_dict["id"] not in nodes_dict:
                nodes_dict[node_dict["id"]] = node_dict

        # Edges — startNode()/endNode()/type() are computed in Cypher itself,
        # so s/e arrive as real Node objects and rel_type as a plain string —
        # no dependency on Python-side relationship attribute access at all.
        for record in session.run(edges_cypher, parameters={"id": entity_id}):
            s_props = dict(record["s"].items())
            e_props = dict(record["e"].items())
            s_id = s_props.get("id") or s_props.get("code")
            e_id = e_props.get("id") or e_props.get("code")
            rel_type = record["rel_type"]
            if s_id and e_id:
                edges_set.add((s_id, e_id, rel_type))

    nodes = list(nodes_dict.values())
    edges = [{"source": src, "target": tgt, "type": rtype} for (src, tgt, rtype) in edges_set]

    return {"nodes": nodes, "edges": edges}
