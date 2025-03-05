from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import TrackSerializer
import requests
from django.shortcuts import render

def index(request):
    return render(request, 'index.html')