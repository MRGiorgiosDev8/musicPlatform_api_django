from rest_framework import serializers

class TrackSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, default='Unknown Track')
    artist = serializers.CharField(required=False, allow_blank=True, default='Unknown Artist')
    listeners = serializers.IntegerField(required=False, default=0)
    url = serializers.URLField(required=False, allow_blank=True, default='#')
    image_url = serializers.URLField(required=False, allow_blank=True, default='/static/images/default.svg')
    mbid = serializers.CharField(required=False, allow_blank=True, default='')