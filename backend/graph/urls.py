from django.urls import path
from .views import (
    HealthCheckView,
    SearchView,
    EntityDetailView,
    EntityNetworkView,
    FraudRingsView,
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('search/', SearchView.as_view(), name='search'),
    path('entities/<str:entity_type>/<str:entity_id>/', EntityDetailView.as_view(), name='entity-detail'),
    path('entities/<str:entity_type>/<str:entity_id>/network/', EntityNetworkView.as_view(), name='entity-network'),
    path('fraud-rings/', FraudRingsView.as_view(), name='fraud-rings'),
]
