from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib.auth import logout, login
from django.contrib.auth.views import LoginView
from django.urls import reverse_lazy
from asgiref.sync import async_to_sync
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser

from .serializers import UserSerializer
from .forms import SignupForm
from music_api.models import Playlist
from music_api.views.tracks_async import _enrich_tracks_list_async


class CustomLoginView(LoginView):
    template_name = 'registration/login.html'
    redirect_authenticated_user = True


def signup_view(request):
    if request.user.is_authenticated:
        return redirect('profile')

    if request.method == 'POST':
        form = SignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('profile')
    else:
        form = SignupForm()

    return render(request, 'registration/signup.html', {'form': form})


@login_required
def profile_view(request):
    if request.method == 'POST':
        # Handle profile update
        user = request.user
        user.bio = request.POST.get('bio', '')
        user.country = request.POST.get('country', '')
        
        if 'avatar' in request.FILES:
            user.avatar = request.FILES['avatar']
        
        gender = request.POST.get('gender')
        if gender in [choice[0] for choice in user.GENDER_CHOICES]:
            user.gender = gender
            
        birth_date = request.POST.get('birth_date')
        if birth_date:
            from datetime import datetime
            try:
                user.birth_date = datetime.strptime(birth_date, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        user.is_public_favorites = request.POST.get('is_public_favorites') == 'on'
        user.save()
        return redirect('profile')
    
    return render(request, 'users/profile.html')


@login_required
def playlists_page_view(request):
    playlist, _ = Playlist.objects.get_or_create(
        user=request.user,
        title='Favorites',
        defaults={'tracks': []},
    )
    raw_tracks = playlist.tracks if isinstance(playlist.tracks, list) else []
    try:
        tracks = async_to_sync(_enrich_tracks_list_async)(raw_tracks)
    except Exception:
        tracks = raw_tracks
    context = {
        'playlist': playlist,
        'tracks': tracks,
    }
    return render(request, 'users/playlists.html', context)


def logout_view(request):
    logout(request)
    return redirect('login')


class UserMeAPIView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user
