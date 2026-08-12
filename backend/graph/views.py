from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from graph.connection import get_driver
from graph import services


class HealthCheckView(APIView):
    """
    Health check API endpoint verifying backend operation and CognoDB connectivity.
    Executes 'RETURN 1' against CognoDB via the neo4j driver singleton.
    """

    def get(self, request):
        try:
            driver = get_driver()
            with driver.session() as session:
                result = session.run("RETURN 1 AS test")
                record = result.single()
                if record and record["test"] == 1:
                    return Response({"status": "ok"}, status=status.HTTP_200_OK)
                else:
                    return Response(
                        {
                            "error": "database_unreachable",
                            "detail": "Unexpected query result received from database.",
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
        except Exception as e:
            return Response(
                {
                    "error": "database_unreachable",
                    "detail": str(e),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class SearchView(APIView):
    """
    Search providers or patients by query string.
    GET /api/search/?q=<string>&type=<provider|patient|all>
    """

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        entity_type = request.query_params.get("type", "all").lower()

        if entity_type not in ["provider", "patient", "all"]:
            return Response(
                {"error": "invalid_parameters", "detail": "Type parameter must be 'provider', 'patient', or 'all'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            driver = get_driver()
            data = services.service_search_entities(driver, query, entity_type)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": "database_unreachable", "detail": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class EntityDetailView(APIView):
    """
    Get detailed metadata, address, phone, and claims for a specific entity.
    GET /api/entities/<type>/<id>/
    """

    def get(self, request, entity_type, entity_id):
        entity_type = entity_type.lower()
        if entity_type not in ["provider", "patient"]:
            return Response(
                {"error": "invalid_parameters", "detail": "Entity type must be 'provider' or 'patient'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            driver = get_driver()
            detail = services.service_get_entity_detail(driver, entity_type, entity_id)
            if not detail:
                return Response(
                    {"error": "not_found", "detail": f"Entity of type '{entity_type}' with ID '{entity_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(detail, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": "database_unreachable", "detail": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class EntityNetworkView(APIView):
    """
    Get graph network centered around entity for interactive force graph visualization.
    GET /api/entities/<type>/<id>/network/?depth=1-3
    """

    def get(self, request, entity_type, entity_id):
        entity_type = entity_type.lower()
        if entity_type not in ["provider", "patient"]:
            return Response(
                {"error": "invalid_parameters", "detail": "Entity type must be 'provider' or 'patient'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            depth = int(request.query_params.get("depth", 2))
            if depth < 1 or depth > 3:
                return Response(
                    {"error": "invalid_parameters", "detail": "Depth parameter must be between 1 and 3."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ValueError:
            return Response(
                {"error": "invalid_parameters", "detail": "Depth parameter must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            driver = get_driver()
            network = services.service_get_entity_network(driver, entity_type, entity_id, depth)
            return Response(network, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": "database_unreachable", "detail": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class FraudRingsView(APIView):
    """
    Detect and list all identified fraud rings in the database.
    GET /api/fraud-rings/
    """

    def get(self, request):
        try:
            driver = get_driver()
            rings_data = services.service_get_fraud_rings(driver)
            return Response(rings_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": "database_unreachable", "detail": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
