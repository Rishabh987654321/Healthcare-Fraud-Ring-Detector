export const CYPHER_QUERIES: Record<string, string> = {
  'entity-detail-provider': `MATCH (p:Provider {id: $id})
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
       a, ph, [c IN claims_raw WHERE c.id IS NOT NULL] AS claims`,

  'entity-detail-patient': `MATCH (p:Patient {id: $id})
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
       a, ph, [c IN claims_raw WHERE c.id IS NOT NULL] AS claims`,

  'shared-address-ring': `MATCH (pr1:Provider)-[:LOCATED_AT]->(a:Address)<-[:LOCATED_AT]-(pr2:Provider)
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
       unique_providers AS providers, patient_cnt`,

  'billing-outlier-ring': `MATCH (c:Claim)-[:BILLED_BY]->(pr:Provider), (c)-[:FOR_PROCEDURE]->(proc:Procedure)
OPTIONAL MATCH (pr)-[:HAS_PHONE]->(ph:Phone)
WITH pr, proc, ph, count(c) AS claim_count
WHERE claim_count >= 50
RETURN pr.id AS provider_id, pr.name AS provider_name, pr.specialty AS specialty,
       proc.code AS proc_code, proc.description AS proc_desc,
       ph.id AS phone_id, ph.number AS phone_label, claim_count`,
};
