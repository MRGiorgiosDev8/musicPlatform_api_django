from rest_framework import serializers

class TrackSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, default='Unknown Track')
    artist = serializers.CharField(required=False, allow_blank=True, default='Unknown Artist')
    listeners = serializers.IntegerField(required=False, default=0)
    url = serializers.URLField(required=False, allow_blank=True, default='#')
    image_url = serializers.URLField(required=False, allow_blank=True, default='/static/images/default.svg')
    mbid = serializers.CharField(required=False, allow_blank=True, default='')


class ReleaseShortSerializer(serializers.Serializer):
    title = serializers.CharField()
    playcount = serializers.IntegerField()
    url = serializers.URLField()
    cover = serializers.URLField()

class ArtistShortSerializer(serializers.Serializer):
    name = serializers.CharField()
    photo_url = serializers.URLField(required=False, allow_blank=True)
    releases = ReleaseShortSerializer(many=True)


class YearTrackSerializer(serializers.Serializer):
    name = serializers.CharField()
    artist = serializers.CharField()
    listeners = serializers.IntegerField()
    url = serializers.URLField()
    image_url = serializers.URLField()