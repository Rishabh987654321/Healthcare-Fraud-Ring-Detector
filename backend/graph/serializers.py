"""
Django REST Framework serializers for request validation and response formatting.
"""

from rest_framework import serializers


class SearchResultSerializer(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.ChoiceField(choices=["provider", "patient"])
    name = serializers.CharField()
    specialty = serializers.CharField(required=False, allow_null=True)
    npi = serializers.CharField(required=False, allow_null=True)
    dob = serializers.CharField(required=False, allow_null=True)


class SearchResponseSerializer(serializers.Serializer):
    results = SearchResultSerializer(many=True)


class AddressSerializer(serializers.Serializer):
    line1 = serializers.CharField(allow_blank=True)
    city = serializers.CharField(allow_blank=True)
    state = serializers.CharField(allow_blank=True)
    zip = serializers.CharField(allow_blank=True)


class PhoneSerializer(serializers.Serializer):
    number = serializers.CharField(allow_blank=True)


class ClaimSerializer(serializers.Serializer):
    id = serializers.CharField()
    date = serializers.CharField()
    amount = serializers.FloatField()
    status = serializers.CharField()
    procedureCode = serializers.CharField()
    procedureDescription = serializers.CharField()


class EntityDetailSerializer(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.ChoiceField(choices=["provider", "patient"])
    name = serializers.CharField()
    specialty = serializers.CharField(required=False, allow_null=True)
    npi = serializers.CharField(required=False, allow_null=True)
    dob = serializers.CharField(required=False, allow_null=True)
    address = AddressSerializer(required=False, allow_null=True)
    phone = PhoneSerializer(required=False, allow_null=True)
    claims = ClaimSerializer(many=True)


class NetworkNodeSerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()
    type = serializers.CharField()
    flagged = serializers.BooleanField(default=False)


class NetworkEdgeSerializer(serializers.Serializer):
    source = serializers.CharField()
    target = serializers.CharField()
    type = serializers.CharField()


class NetworkResponseSerializer(serializers.Serializer):
    nodes = NetworkNodeSerializer(many=True)
    edges = NetworkEdgeSerializer(many=True)


class FraudRingSharedNodeSerializer(serializers.Serializer):
    type = serializers.CharField()
    id = serializers.CharField()
    label = serializers.CharField()


class FraudRingProcedureSerializer(serializers.Serializer):
    code = serializers.CharField()
    description = serializers.CharField()


class FraudRingProviderSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    claimCount = serializers.IntegerField(required=False)
    specialtyAvg = serializers.FloatField(required=False)


class FraudRingSerializer(serializers.Serializer):
    id = serializers.CharField()
    kind = serializers.CharField()
    sharedNode = FraudRingSharedNodeSerializer()
    procedure = FraudRingProcedureSerializer()
    providers = FraudRingProviderSerializer(many=True)
    patientCount = serializers.IntegerField(required=False)
    severity = serializers.CharField()


class FraudRingsResponseSerializer(serializers.Serializer):
    rings = FraudRingSerializer(many=True)
