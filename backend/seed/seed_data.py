#!/usr/bin/env python
"""
Seed data generator script for Healthcare Fraud Ring Detector.
Establishes schema constraints and seeds CognoDB with ~2,000 patients, ~150 providers,
~30 procedures, and ~6,000 claims, planting 2 specific fraud rings.

Run from backend directory:
    python seed/seed_data.py --yes
"""

import os
import sys
import random
import argparse
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from graph.connection import get_driver, close_driver
from graph.queries import create_constraints
# pyrefly: ignore [missing-import]
from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)

# Batch size for UNWIND Cypher inserts
BATCH_SIZE = 500


def clear_database(driver):
    """
    Clears all existing nodes and relationships from CognoDB.
    """
    print("Clearing existing graph data (MATCH (n) DETACH DELETE n)...")
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    print("Database cleared successfully.")


def seed_procedures(driver):
    """
    Seeds ~30 CPT procedures, including 4 marked as rare.
    """
    print("Seeding ~30 procedure nodes...")
    procedures = [
        # Standard Procedures
        {"code": "CPT-99213", "description": "Office/outpatient visit, low complexity", "typical_cost": 110.0, "is_rare": False},
        {"code": "CPT-99214", "description": "Office/outpatient visit, moderate complexity", "typical_cost": 165.0, "is_rare": False},
        {"code": "CPT-99215", "description": "Office/outpatient visit, high complexity", "typical_cost": 240.0, "is_rare": False},
        {"code": "CPT-99283", "description": "Emergency department visit, moderate severity", "typical_cost": 320.0, "is_rare": False},
        {"code": "CPT-99284", "description": "Emergency department visit, high severity without immediate threat", "typical_cost": 550.0, "is_rare": False},
        {"code": "CPT-99285", "description": "Emergency department visit, high severity with immediate threat", "typical_cost": 920.0, "is_rare": False},
        {"code": "CPT-71045", "description": "Chest X-ray, single view", "typical_cost": 85.0, "is_rare": False},
        {"code": "CPT-71046", "description": "Chest X-ray, 2 views", "typical_cost": 125.0, "is_rare": False},
        {"code": "CPT-80053", "description": "Comprehensive metabolic panel", "typical_cost": 65.0, "is_rare": False},
        {"code": "CPT-85025", "description": "Complete blood count (CBC) with automated differential", "typical_cost": 45.0, "is_rare": False},
        {"code": "CPT-93000", "description": "Electrocardiogram (ECG/EKG), routine with interpretation", "typical_cost": 95.0, "is_rare": False},
        {"code": "CPT-36415", "description": "Routine venipuncture (blood draw)", "typical_cost": 25.0, "is_rare": False},
        {"code": "CPT-70450", "description": "CT Head/Brain without contrast", "typical_cost": 480.0, "is_rare": False},
        {"code": "CPT-73721", "description": "MRI Knee joint without contrast", "typical_cost": 750.0, "is_rare": False},
        {"code": "CPT-72148", "description": "MRI Lumbar spine without contrast", "typical_cost": 820.0, "is_rare": False},
        {"code": "CPT-99203", "description": "Initial office visit, low complexity", "typical_cost": 180.0, "is_rare": False},
        {"code": "CPT-99204", "description": "Initial office visit, moderate complexity", "typical_cost": 270.0, "is_rare": False},
        {"code": "CPT-99205", "description": "Initial office visit, high complexity", "typical_cost": 380.0, "is_rare": False},
        {"code": "CPT-80048", "description": "Basic metabolic panel", "typical_cost": 50.0, "is_rare": False},
        {"code": "CPT-84443", "description": "Thyroid stimulating hormone (TSH) test", "typical_cost": 75.0, "is_rare": False},
        {"code": "CPT-82947", "description": "Assay of glucose, quantitative", "typical_cost": 30.0, "is_rare": False},
        {"code": "CPT-93010", "description": "Electrocardiogram report only", "typical_cost": 50.0, "is_rare": False},
        {"code": "CPT-76700", "description": "Ultrasound abdominal complete", "typical_cost": 340.0, "is_rare": False},
        {"code": "CPT-71260", "description": "CT Thorax with contrast", "typical_cost": 620.0, "is_rare": False},
        {"code": "CPT-99395", "description": "Preventive medicine evaluation, adult 18-39", "typical_cost": 210.0, "is_rare": False},
        {"code": "CPT-99396", "description": "Preventive medicine evaluation, adult 40-64", "typical_cost": 230.0, "is_rare": False},

        # Rare Procedures (specifically used for fraud ring detection)
        {"code": "CPT-99499", "description": "Unlisted evaluation and management service", "typical_cost": 1850.0, "is_rare": True},
        {"code": "CPT-00100", "description": "Anesthesia for salivary gland procedures", "typical_cost": 1450.0, "is_rare": True},
        {"code": "CPT-20930", "description": "Allograft for spine surgery, morselized", "typical_cost": 2900.0, "is_rare": True},
        {"code": "CPT-95999", "description": "Unlisted neurological diagnostic procedure", "typical_cost": 2100.0, "is_rare": True},
    ]

    cypher = """
    UNWIND $batch AS row
    CREATE (p:Procedure {
        code: row.code,
        description: row.description,
        typical_cost: row.typical_cost,
        is_rare: row.is_rare
    })
    """
    with driver.session() as session:
        session.run(cypher, batch=procedures)

    print(f"Created {len(procedures)} procedure nodes.")
    return procedures


def seed_addresses_and_phones(driver, count=2200):
    """
    Generates pool of unique Address and Phone nodes.
    """
    print(f"Generating pool of {count} addresses and phones...")
    addresses = []
    phones = []

    for i in range(1, count + 1):
        addr_id = f"ADDR-{i:05d}"
        phone_id = f"PHONE-{i:05d}"

        addresses.append({
            "id": addr_id,
            "line1": fake.street_address(),
            "city": fake.city(),
            "state": fake.state_abbr(),
            "zip": fake.zipcode()
        })

        phones.append({
            "id": phone_id,
            "number": fake.phone_number()
        })

    # Bulk insert Addresses
    cypher_addr = """
    UNWIND $batch AS row
    CREATE (a:Address {
        id: row.id,
        line1: row.line1,
        city: row.city,
        state: row.state,
        zip: row.zip
    })
    """
    with driver.session() as session:
        for i in range(0, len(addresses), BATCH_SIZE):
            session.run(cypher_addr, batch=addresses[i:i + BATCH_SIZE])

    # Bulk insert Phones
    cypher_phone = """
    UNWIND $batch AS row
    CREATE (p:Phone {
        id: row.id,
        number: row.number
    })
    """
    with driver.session() as session:
        for i in range(0, len(phones), BATCH_SIZE):
            session.run(cypher_phone, batch=phones[i:i + BATCH_SIZE])

    print(f"Created {len(addresses)} address nodes and {len(phones)} phone nodes.")
    return addresses, phones


def seed_providers(driver, addresses, phones, count=150):
    """
    Generates ~150 Provider nodes across 8 specialties, linking each to Address and Phone.
    """
    print(f"Seeding {count} provider nodes...")
    specialties = [
        "General Practice", "Cardiology", "Orthopedics", "Neurology",
        "Pediatrics", "Oncology", "Dermatology", "Psychiatry"
    ]

    providers = []
    rel_located = []
    rel_phone = []

    for i in range(1, count + 1):
        provider_id = f"PRV-{1000 + i}"
        npi = f"182{i:07d}"
        name = f"Dr. {fake.first_name()} {fake.last_name()}, MD"
        specialty = specialties[i % len(specialties)]

        addr_id = addresses[i - 1]["id"]
        phone_id = phones[i - 1]["id"]

        providers.append({
            "id": provider_id,
            "name": name,
            "npi": npi,
            "specialty": specialty
        })

        rel_located.append({"provider_id": provider_id, "addr_id": addr_id})
        rel_phone.append({"provider_id": provider_id, "phone_id": phone_id})

    # Bulk create Provider nodes
    cypher_prov = """
    UNWIND $batch AS row
    CREATE (p:Provider {
        id: row.id,
        name: row.name,
        npi: row.npi,
        specialty: row.specialty
    })
    """
    with driver.session() as session:
        session.run(cypher_prov, batch=providers)

    # Bulk link Provider LOCATED_AT Address
    cypher_loc = """
    UNWIND $batch AS row
    MATCH (p:Provider {id: row.provider_id})
    MATCH (a:Address {id: row.addr_id})
    CREATE (p)-[:LOCATED_AT]->(a)
    """
    with driver.session() as session:
        session.run(cypher_loc, batch=rel_located)

    # Bulk link Provider HAS_PHONE Phone
    cypher_ph = """
    UNWIND $batch AS row
    MATCH (p:Provider {id: row.provider_id})
    MATCH (ph:Phone {id: row.phone_id})
    CREATE (p)-[:HAS_PHONE]->(ph)
    """
    with driver.session() as session:
        session.run(cypher_ph, batch=rel_phone)

    print(f"Created {len(providers)} provider nodes with address and phone relationships.")
    return providers


def seed_patients(driver, addresses, phones, start_idx=200, count=2000):
    """
    Generates ~2,000 Patient nodes linked to Address and Phone.
    """
    print(f"Seeding {count} patient nodes...")
    patients = []
    rel_located = []
    rel_phone = []

    start_date = datetime(1945, 1, 1)

    for i in range(1, count + 1):
        patient_id = f"PAT-{10000 + i}"
        name = fake.name()
        dob_dt = start_date + timedelta(days=random.randint(0, 27000))
        dob = dob_dt.strftime("%Y-%m-%d")

        addr_id = addresses[start_idx + i - 1]["id"]
        phone_id = phones[start_idx + i - 1]["id"]

        patients.append({
            "id": patient_id,
            "name": name,
            "dob": dob
        })

        rel_located.append({"patient_id": patient_id, "addr_id": addr_id})
        rel_phone.append({"patient_id": patient_id, "phone_id": phone_id})

    # Bulk create Patient nodes
    cypher_pat = """
    UNWIND $batch AS row
    CREATE (p:Patient {
        id: row.id,
        name: row.name,
        dob: row.dob
    })
    """
    with driver.session() as session:
        for i in range(0, len(patients), BATCH_SIZE):
            session.run(cypher_pat, batch=patients[i:i + BATCH_SIZE])

    # Bulk link Patient LOCATED_AT Address
    cypher_loc = """
    UNWIND $batch AS row
    MATCH (p:Patient {id: row.patient_id})
    MATCH (a:Address {id: row.addr_id})
    CREATE (p)-[:LOCATED_AT]->(a)
    """
    with driver.session() as session:
        for i in range(0, len(rel_located), BATCH_SIZE):
            session.run(cypher_loc, batch=rel_located[i:i + BATCH_SIZE])

    # Bulk link Patient HAS_PHONE Phone
    cypher_ph = """
    UNWIND $batch AS row
    MATCH (p:Patient {id: row.patient_id})
    MATCH (ph:Phone {id: row.phone_id})
    CREATE (p)-[:HAS_PHONE]->(ph)
    """
    with driver.session() as session:
        for i in range(0, len(rel_phone), BATCH_SIZE):
            session.run(cypher_ph, batch=rel_phone[i:i + BATCH_SIZE])

    print(f"Created {len(patients)} patient nodes with address and phone relationships.")
    return patients


def seed_standard_claims(driver, patients, providers, procedures, count=6000):
    """
    Generates ~6,000 realistic Claim nodes distributed across patients, providers, and procedures.
    """
    print(f"Seeding ~{count} standard claim nodes and relationships...")
    standard_procedures = [p for p in procedures if not p["is_rare"]]

    claims = []
    rel_submitted = []
    rel_billed = []
    rel_procedure = []

    start_date = datetime(2023, 1, 1)

    statuses = ["PAID", "PAID", "PAID", "PAID", "DENIED", "PENDING"]

    for i in range(1, count + 1):
        claim_id = f"CLM-{500000 + i}"
        claim_dt = start_date + timedelta(days=random.randint(0, 500))
        claim_date = claim_dt.strftime("%Y-%m-%d")
        status = random.choice(statuses)

        proc = random.choice(standard_procedures)
        provider = random.choice(providers)
        patient = random.choice(patients)

        # Vary amount slightly around typical cost
        amount = round(proc["typical_cost"] * random.uniform(0.85, 1.15), 2)

        claims.append({
            "id": claim_id,
            "date": claim_date,
            "amount": amount,
            "status": status
        })

        rel_submitted.append({"patient_id": patient["id"], "claim_id": claim_id})
        rel_billed.append({"claim_id": claim_id, "provider_id": provider["id"]})
        rel_procedure.append({"claim_id": claim_id, "proc_code": proc["code"]})

    # Bulk insert Claims
    cypher_clm = """
    UNWIND $batch AS row
    CREATE (c:Claim {
        id: row.id,
        date: row.date,
        amount: row.amount,
        status: row.status
    })
    """
    with driver.session() as session:
        for i in range(0, len(claims), BATCH_SIZE):
            session.run(cypher_clm, batch=claims[i:i + BATCH_SIZE])

    # Bulk link Patient SUBMITTED Claim
    cypher_sub = """
    UNWIND $batch AS row
    MATCH (p:Patient {id: row.patient_id})
    MATCH (c:Claim {id: row.claim_id})
    CREATE (p)-[:SUBMITTED]->(c)
    """
    with driver.session() as session:
        for i in range(0, len(rel_submitted), BATCH_SIZE):
            session.run(cypher_sub, batch=rel_submitted[i:i + BATCH_SIZE])

    # Bulk link Claim BILLED_BY Provider
    cypher_bill = """
    UNWIND $batch AS row
    MATCH (c:Claim {id: row.claim_id})
    MATCH (pr:Provider {id: row.provider_id})
    CREATE (c)-[:BILLED_BY]->(pr)
    """
    with driver.session() as session:
        for i in range(0, len(rel_billed), BATCH_SIZE):
            session.run(cypher_bill, batch=rel_billed[i:i + BATCH_SIZE])

    # Bulk link Claim FOR_PROCEDURE Procedure
    cypher_proc = """
    UNWIND $batch AS row
    MATCH (c:Claim {id: row.claim_id})
    MATCH (pr:Procedure {code: row.proc_code})
    CREATE (c)-[:FOR_PROCEDURE]->(pr)
    """
    with driver.session() as session:
        for i in range(0, len(rel_procedure), BATCH_SIZE):
            session.run(cypher_proc, batch=rel_procedure[i:i + BATCH_SIZE])

    print(f"Created {len(claims)} claim nodes and associated relationships.")


def plant_fraud_rings(driver, patients, providers):
    """
    Plants exactly 2 distinct fraud rings:
    Ring A: 3 providers sharing 1 Address node, all billing the same rare procedure across ~15 shared patients.
    Ring B: 2 providers sharing 1 Phone node, 1 provider billing 5x the average volume for a specific procedure.
    """
    print("Planting Fraud Ring A (Shared Address + Rare Procedure Billing)...")

    # Ring A details
    ring_a_addr_id = "ADDR-RINGA-999"
    ring_a_providers = [
        {"id": "PRV-RINGA-01", "name": "Dr. Arthur Pendelton, MD", "npi": "1829990001", "specialty": "General Practice"},
        {"id": "PRV-RINGA-02", "name": "Dr. Beatrice Vance, MD", "npi": "1829990002", "specialty": "Orthopedics"},
        {"id": "PRV-RINGA-03", "name": "Dr. Charles Xavier, MD", "npi": "1829990003", "specialty": "Neurology"},
    ]
    ring_a_rare_procedure_code = "CPT-99499" # Unlisted evaluation and management service

    # Pick 15 shared patients from existing patient list
    shared_patients_ring_a = patients[:15]

    with driver.session() as session:
        # Create Ring A shared address
        session.run("""
            CREATE (a:Address {
                id: $addr_id,
                line1: "100 Fraudulent Boulevard, Suite 400",
                city: "Miami",
                state: "FL",
                zip: "33101"
            })
        """, addr_id=ring_a_addr_id)

        # Create Ring A providers and link to shared address
        for p in ring_a_providers:
            session.run("""
                CREATE (pr:Provider {id: $id, name: $name, npi: $npi, specialty: $specialty})
                WITH pr
                MATCH (a:Address {id: $addr_id})
                CREATE (pr)-[:LOCATED_AT]->(a)
            """, id=p["id"], name=p["name"], npi=p["npi"], specialty=p["specialty"], addr_id=ring_a_addr_id)

        # Create ~45 claims (15 patients x 3 providers all billing CPT-99499)
        claim_index = 900001
        for pat in shared_patients_ring_a:
            for pr in ring_a_providers:
                claim_id = f"CLM-RINGA-{claim_index}"
                claim_index += 1
                session.run("""
                    CREATE (c:Claim {
                        id: $claim_id,
                        date: "2024-03-15",
                        amount: 1850.00,
                        status: "PAID"
                    })
                    WITH c
                    MATCH (p:Patient {id: $patient_id})
                    MATCH (pr:Provider {id: $provider_id})
                    MATCH (proc:Procedure {code: $proc_code})
                    CREATE (p)-[:SUBMITTED]->(c)
                    CREATE (c)-[:BILLED_BY]->(pr)
                    CREATE (c)-[:FOR_PROCEDURE]->(proc)
                """, claim_id=claim_id, patient_id=pat["id"], provider_id=pr["id"], proc_code=ring_a_rare_procedure_code)

    print("Fraud Ring A planted successfully.")

    print("Planting Fraud Ring B (Shared Phone + 5x Billing Spike)...")

    # Ring B details
    ring_b_phone_id = "PHONE-RINGB-888"
    ring_b_providers = [
        {"id": "PRV-RINGB-01", "name": "Dr. Dominick Cobb, MD", "npi": "1828880001", "specialty": "Cardiology"},
        {"id": "PRV-RINGB-02", "name": "Dr. Eleanor Arroway, MD", "npi": "1828880002", "specialty": "Cardiology"},
    ]
    spike_procedure_code = "CPT-99215" # Office/outpatient visit, high complexity

    with driver.session() as session:
        # Create Ring B shared Phone
        session.run("""
            CREATE (ph:Phone {
                id: $phone_id,
                number: "(555) 019-8888"
            })
        """, phone_id=ring_b_phone_id)

        # Create Ring B providers and link to shared Phone
        for p in ring_b_providers:
            session.run("""
                CREATE (pr:Provider {id: $id, name: $name, npi: $npi, specialty: $specialty})
                WITH pr
                MATCH (ph:Phone {id: $phone_id})
                CREATE (pr)-[:HAS_PHONE]->(ph)
            """, id=p["id"], name=p["name"], npi=p["npi"], specialty=p["specialty"], phone_id=ring_b_phone_id)

        # Generate 5x billing volume spike for PRV-RINGB-01 (~125 claims for CPT-99215)
        spike_patients = patients[20:145] # 125 distinct patients
        claim_index_b = 950001
        for pat in spike_patients:
            claim_id = f"CLM-RINGB-{claim_index_b}"
            claim_index_b += 1
            session.run("""
                CREATE (c:Claim {
                    id: $claim_id,
                    date: "2024-02-10",
                    amount: 240.00,
                    status: "PAID"
                })
                WITH c
                MATCH (p:Patient {id: $patient_id})
                MATCH (pr:Provider {id: "PRV-RINGB-01"})
                MATCH (proc:Procedure {code: $proc_code})
                CREATE (p)-[:SUBMITTED]->(c)
                CREATE (c)-[:BILLED_BY]->(pr)
                CREATE (c)-[:FOR_PROCEDURE]->(proc)
            """, claim_id=claim_id, patient_id=pat["id"], proc_code=spike_procedure_code)

    print("Fraud Ring B planted successfully.")

    return {
        "ring_a": {
            "address_id": ring_a_addr_id,
            "provider_ids": [p["id"] for p in ring_a_providers],
            "rare_procedure": ring_a_rare_procedure_code,
            "shared_patient_count": len(shared_patients_ring_a),
        },
        "ring_b": {
            "phone_id": ring_b_phone_id,
            "provider_ids": [p["id"] for p in ring_b_providers],
            "spiked_provider_id": "PRV-RINGB-01",
            "spike_procedure": spike_procedure_code,
            "spiked_claim_count": 125,
        }
    }


def main():
    parser = argparse.ArgumentParser(description="Seed CognoDB for Healthcare Fraud Ring Detector.")
    parser.add_argument("-y", "--yes", action="store_true", help="Skip confirmation prompt before clearing database.")
    args = parser.parse_args()

    print("=" * 60)
    print(" CognoDB Seed Data Generator — Healthcare Fraud Ring Detector")
    print("=" * 60)

    if not args.yes:
        confirm = input("WARNING: This will delete ALL existing graph data in CognoDB. Continue? (y/N): ")
        if confirm.lower() not in ["y", "yes"]:
            print("Aborted.")
            sys.exit(0)

    driver = get_driver()
    try:
        # Step 1: Create constraints
        print("\n1. Enforcing schema uniqueness constraints...")
        create_constraints(driver)

        # Step 2: Clear database
        print("\n2. Clearing graph database...")
        clear_database(driver)

        # Step 3: Seed nodes and relationships
        print("\n3. Seeding Procedures...")
        procedures = seed_procedures(driver)

        print("\n4. Seeding Address and Phone pools...")
        addresses, phones = seed_addresses_and_phones(driver, count=2200)

        print("\n5. Seeding Providers...")
        providers = seed_providers(driver, addresses, phones, count=150)

        print("\n6. Seeding Patients...")
        patients = seed_patients(driver, addresses, phones, start_idx=200, count=2000)

        print("\n7. Seeding Standard Claims (~6,000)...")
        seed_standard_claims(driver, patients, providers, procedures, count=6000)

        print("\n8. Planting Fraud Rings...")
        ring_summary = plant_fraud_rings(driver, patients, providers)

        print("\n" + "=" * 60)
        print(" SEEDING COMPLETE — PLANTED FRAUD RINGS SUMMARY")
        print("=" * 60)
        print("Ring A (Shared Address + Rare Procedure):")
        print(f"  - Address ID     : {ring_summary['ring_a']['address_id']}")
        print(f"  - Provider IDs   : {', '.join(ring_summary['ring_a']['provider_ids'])}")
        print(f"  - Procedure Code : {ring_summary['ring_a']['rare_procedure']}")
        print(f"  - Shared Patients: {ring_summary['ring_a']['shared_patient_count']}")

        print("\nRing B (Shared Phone + 5x Billing Spike):")
        print(f"  - Phone ID       : {ring_summary['ring_b']['phone_id']}")
        print(f"  - Provider IDs   : {', '.join(ring_summary['ring_b']['provider_ids'])}")
        print(f"  - Spiked Provider: {ring_summary['ring_b']['spiked_provider_id']}")
        print(f"  - Spiked Procedure: {ring_summary['ring_b']['spike_procedure']} ({ring_summary['ring_b']['spiked_claim_count']} claims)")
        print("=" * 60)

    finally:
        close_driver()


if __name__ == "__main__":
    main()
