"""
Integration tests for Fraud Ring Detector REST API endpoints against the live seeded CognoDB instance.

Note: These are integration tests running directly against the live CognoDB graph database instance
containing seeded provider/patient datasets (Ring A, Ring B, Pendelton).
"""
from rest_framework.test import APITestCase
from rest_framework import status


class FraudRingApiTests(APITestCase):
    """Integration test suite for graph REST endpoints."""

    def test_health_check_returns_ok(self):
        """
        Hits /api/health/, asserts 200 OK and {"status": "ok"}.
        """
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'ok')

    def test_fraud_rings_endpoint_finds_ring_a(self):
        """
        Hits /api/fraud-rings/, asserts response contains a ring with kind == 'shared_address_procedure'
        and ADDR-RINGA-999 appears as the sharedNode id.
        """
        response = self.client.get('/api/fraud-rings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rings = response.data.get('rings', [])

        ring_a = next((r for r in rings if r.get('kind') == 'shared_address_procedure'), None)
        self.assertIsNotNone(ring_a, "Fraud ring with kind 'shared_address_procedure' was not found.")
        self.assertEqual(ring_a.get('sharedNode', {}).get('id'), 'ADDR-RINGA-999')

    def test_fraud_rings_endpoint_finds_ring_b(self):
        """
        Hits /api/fraud-rings/, asserts a ring with kind == 'billing_outlier' exists
        and PRV-RINGB-01 appears among its providers.
        """
        response = self.client.get('/api/fraud-rings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rings = response.data.get('rings', [])

        ring_b = next((r for r in rings if r.get('kind') == 'billing_outlier'), None)
        self.assertIsNotNone(ring_b, "Fraud ring with kind 'billing_outlier' was not found.")

        provider_ids = [p.get('id') for p in ring_b.get('providers', [])]
        self.assertIn('PRV-RINGB-01', provider_ids)

    def test_search_entities_finds_known_provider(self):
        """
        Hits /api/search/?q=Pendelton, asserts PRV-RINGA-01 is in the search results.
        """
        response = self.client.get('/api/search/?q=Pendelton')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', [])

        found = any(r.get('id') == 'PRV-RINGA-01' for r in results)
        self.assertTrue(found, "Provider PRV-RINGA-01 was not found in search results for 'Pendelton'.")
