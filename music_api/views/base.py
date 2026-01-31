import logging
import requests
from decouple import config

# Reusable logger for the entire views package
logger = logging.getLogger(__name__)

# API Configuration
LASTFM_KEY = config("LASTFM_KEY")