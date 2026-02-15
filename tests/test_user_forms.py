import pytest
from django.contrib.auth import get_user_model

from users.forms import SignupForm


pytestmark = pytest.mark.django_db


def test_signup_form_valid_data_creates_user_and_hashes_password():
    form = SignupForm(
        data={
            "username": "new_user",
            "email": "new_user@example.com",
            "password": "StrongPass_123!",
            "password_confirm": "StrongPass_123!",
        }
    )

    assert form.is_valid(), form.errors
    user = form.save()

    assert user.username == "new_user"
    assert user.email == "new_user@example.com"
    assert user.password != "StrongPass_123!"
    assert user.check_password("StrongPass_123!")


def test_signup_form_rejects_password_confirmation_mismatch():
    form = SignupForm(
        data={
            "username": "mismatch_user",
            "email": "mismatch@example.com",
            "password": "StrongPass_123!",
            "password_confirm": "AnotherStrongPass_456!",
        }
    )

    assert not form.is_valid()
    assert "password_confirm" in form.errors
    assert "Password confirmation does not match." in form.errors["password_confirm"]


def test_signup_form_rejects_weak_password():
    form = SignupForm(
        data={
            "username": "weak_user",
            "email": "weak@example.com",
            "password": "123",
            "password_confirm": "123",
        }
    )

    assert not form.is_valid()
    assert "password" in form.errors


def test_signup_form_rejects_duplicate_email_case_insensitive():
    User = get_user_model()
    User.objects.create_user(
        username="existing_user",
        email="existing@example.com",
        password="StrongPass_123!",
    )

    form = SignupForm(
        data={
            "username": "another_user",
            "email": "EXISTING@example.com",
            "password": "AnotherStrongPass_456!",
            "password_confirm": "AnotherStrongPass_456!",
        }
    )

    assert not form.is_valid()
    assert "email" in form.errors
    assert "A user with this email already exists." in form.errors["email"]
