from types import SimpleNamespace

from django.contrib.auth.forms import AuthenticationForm
from django.template.loader import render_to_string
from django.test import RequestFactory


def test_admin_login_template_includes_home_link():
    request = RequestFactory().get("/admin/login/")
    request.user = SimpleNamespace(is_authenticated=False)

    html = render_to_string(
        "admin/login.html",
        {
            "form": AuthenticationForm(request=request),
            "app_path": "/admin/login/",
            "next": "/admin/",
            "username": "",
            "request": request,
        },
        request=request,
    )

    assert "На главную сайта" in html
    assert 'href="/"' in html


def test_admin_login_template_shows_restore_notice():
    request = RequestFactory().get("/admin/login/?restored=1")
    request.user = SimpleNamespace(is_authenticated=False)

    html = render_to_string(
        "admin/login.html",
        {
            "form": AuthenticationForm(request=request),
            "app_path": "/admin/login/",
            "next": "/admin/",
            "username": "",
            "request": request,
        },
        request=request,
    )

    assert "Backup восстановлен" in html


def test_admin_login_template_shows_restore_error():
    request = RequestFactory().get("/admin/login/?restore_error=1")
    request.user = SimpleNamespace(is_authenticated=False)

    html = render_to_string(
        "admin/login.html",
        {
            "form": AuthenticationForm(request=request),
            "app_path": "/admin/login/",
            "next": "/admin/",
            "username": "",
            "request": request,
        },
        request=request,
    )

    assert "не полностью или завершился с ошибкой" in html
