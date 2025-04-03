from rest_framework import serializers

class TrackSerializer(serializers.Serializer):
    name = serializers.CharField()
    artist = serializers.CharField()
    listeners = serializers.IntegerField()
    url = serializers.URLField()