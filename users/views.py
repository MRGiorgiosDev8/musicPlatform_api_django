from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.http import Http404
from django.contrib.auth import logout, login, update_session_auth_hash
from django.contrib.auth.views import LoginView
from django.contrib.auth import get_user_model
from django.conf import settings
from asgiref.sync import async_to_sync
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser

from .serializers import UserSerializer
from .forms import SignupForm, ProfileUpdateForm, LoginForm
from music_api.models import Playlist, PlaylistLikeNotification
from music_api.views.tracks_async import _enrich_tracks_list_async

User = get_user_model()


class CustomLoginView(LoginView):
    template_name = "registration/login.html"
    redirect_authenticated_user = True
    authentication_form = LoginForm

    def form_valid(self, form):
        response = super().form_valid(form)
        remember = bool(form.cleaned_data.get("remember"))
        if remember:
            self.request.session.set_expiry(settings.SESSION_COOKIE_AGE)
        else:
            self.request.session.set_expiry(settings.SESSION_SHORT_COOKIE_AGE)
        return response


def signup_view(request):
    if request.user.is_authenticated:
        return redirect("profile")

    if request.method == "POST":
        form = SignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("profile")
    else:
        form = SignupForm()

    return render(request, "registration/signup.html", {"form": form})


@login_required
def profile_view(request):
    if request.method == "POST":
        form = ProfileUpdateForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            user = form.save()
            if form.cleaned_data.get("new_password"):
                update_session_auth_hash(request, user)
            return redirect("profile")
    else:
        form = ProfileUpdateForm(instance=request.user)

    like_notifications = (
        PlaylistLikeNotification.objects.filter(recipient=request.user)
        .select_related("actor")
        .order_by("-created_at")[:10]
    )

    return render(
        request,
        "users/profile.html",
        {
            "form": form,
            "like_notifications": like_notifications,
        },
    )


@login_required
def playlists_page_view(request):
    playlist = Playlist.objects.filter(user=request.user).order_by("created_at").first()
    if playlist is None:
        playlist = Playlist.objects.create(
            user=request.user, title="Favorites", tracks=[]
        )
    raw_tracks = playlist.tracks if isinstance(playlist.tracks, list) else []
    try:
        tracks = async_to_sync(_enrich_tracks_list_async)(raw_tracks)
    except Exception:
        tracks = raw_tracks
    context = {
        "playlist": playlist,
        "tracks": tracks,
    }
    return render(request, "users/playlists.html", context)


def public_user_page_view(request, username):
    profile_user = get_object_or_404(User, username__iexact=username)
    if not profile_user.is_public_favorites:
        raise Http404("Public favorites not available")

    playlist = Playlist.objects.filter(user=profile_user).order_by("created_at").first()
    if playlist is None:
        playlist = Playlist.objects.create(
            user=profile_user, title="Favorites", tracks=[]
        )
    raw_tracks = playlist.tracks if isinstance(playlist.tracks, list) else []
    try:
        tracks = async_to_sync(_enrich_tracks_list_async)(raw_tracks)
    except Exception:
        tracks = raw_tracks

    likes_count = playlist.likes.count()
    liked_by_me = False
    if request.user.is_authenticated:
        liked_by_me = playlist.likes.filter(user=request.user).exists()

    return render(
        request,
        "users/public_profile.html",
        {
            "profile_user": profile_user,
            "is_public_available": True,
            "playlist": playlist,
            "tracks": tracks,
            "likes_count": likes_count,
            "liked_by_me": liked_by_me,
            "tracks_count": len(raw_tracks),
        },
    )


def logout_view(request):
    logout(request)
    return redirect("login")


class UserMeAPIView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user
