from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib.auth import logout, login, update_session_auth_hash
from django.contrib.auth.views import LoginView
from django.conf import settings
from django.urls import reverse_lazy
from asgiref.sync import async_to_sync
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser

from .serializers import UserSerializer
from .forms import SignupForm, ProfileUpdateForm, LoginForm
from music_api.models import Playlist
from music_api.views.tracks_async import _enrich_tracks_list_async


class CustomLoginView(LoginView):
    template_name = 'registration/login.html'
    redirect_authenticated_user = True
    authentication_form = LoginForm

    def form_valid(self, form):
        response = super().form_valid(form)
        remember = bool(form.cleaned_data.get('remember'))
        if remember:
            self.request.session.set_expiry(settings.SESSION_COOKIE_AGE)
        else:
            self.request.session.set_expiry(settings.SESSION_SHORT_COOKIE_AGE)
        return response


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
        form = ProfileUpdateForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            user = form.save()
            if form.cleaned_data.get('new_password'):
                update_session_auth_hash(request, user)
            return redirect('profile')
    else:
        form = ProfileUpdateForm(instance=request.user)

    return render(request, 'users/profile.html', {'form': form})


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
