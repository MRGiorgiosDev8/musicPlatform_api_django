from rest_framework import serializers

class TrackSerializer(serializers.Serializer):
    name = serializers.CharField()
    artist = serializers.CharField()
    listeners = serializers.IntegerField(required=False)
    url = serializers.URLField(required=False)