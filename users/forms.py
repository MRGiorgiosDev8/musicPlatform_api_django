from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError


User = get_user_model()


class LoginForm(AuthenticationForm):
    remember = forms.BooleanField(
        required=False,
        initial=False,
        label='Запомнить меня',
    )


class SignupForm(forms.ModelForm):
    password = forms.CharField(
        label='Password',
        widget=forms.PasswordInput,
        required=True,
    )
    password_confirm = forms.CharField(
        label='Password Confirm',
        widget=forms.PasswordInput,
        required=True,
    )

    class Meta:
        model = User
        fields = ('username', 'email')

    def clean_email(self):
        email = self.cleaned_data.get('email', '').strip().lower()
        if not email:
            raise ValidationError('Email is required.')
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError('A user with this email already exists.')
        return email

    def clean_password(self):
        password = self.cleaned_data.get('password')
        if not password:
            raise ValidationError('Password is required.')
        validate_password(password)
        return password

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password_confirm = cleaned_data.get('password_confirm')

        if password and password_confirm and password != password_confirm:
            self.add_error('password_confirm', 'Password confirmation does not match.')

        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.set_password(self.cleaned_data['password'])
        if commit:
            user.save()
        return user


class ProfileUpdateForm(forms.ModelForm):
    current_password = forms.CharField(
        label='Current password',
        widget=forms.PasswordInput,
        required=False,
    )
    new_password = forms.CharField(
        label='New password',
        widget=forms.PasswordInput,
        required=False,
    )
    new_password_confirm = forms.CharField(
        label='Confirm new password',
        widget=forms.PasswordInput,
        required=False,
    )

    class Meta:
        model = User
        fields = (
            'username',
            'email',
            'bio',
            'gender',
            'country',
            'birth_date',
            'is_public_favorites',
            'avatar',
        )

    def clean_username(self):
        username = (self.cleaned_data.get('username') or '').strip()
        if not username:
            raise ValidationError('Username is required.')
        qs = User.objects.filter(username__iexact=username)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError('A user with this username already exists.')
        return username

    def clean_email(self):
        email = (self.cleaned_data.get('email') or '').strip().lower()
        if not email:
            raise ValidationError('Email is required.')
        qs = User.objects.filter(email__iexact=email)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError('A user with this email already exists.')
        return email

    def clean(self):
        cleaned_data = super().clean()

        current_password = cleaned_data.get('current_password')
        new_password = cleaned_data.get('new_password')
        new_password_confirm = cleaned_data.get('new_password_confirm')

        wants_password_change = bool(current_password or new_password or new_password_confirm)
        if not wants_password_change:
            return cleaned_data

        if not current_password:
            self.add_error('current_password', 'Current password is required.')
        elif not self.instance.check_password(current_password):
            self.add_error('current_password', 'Current password is incorrect.')

        if not new_password:
            self.add_error('new_password', 'New password is required.')
        else:
            validate_password(new_password, self.instance)

        if not new_password_confirm:
            self.add_error('new_password_confirm', 'Password confirmation is required.')
        elif new_password and new_password != new_password_confirm:
            self.add_error('new_password_confirm', 'Password confirmation does not match.')

        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        new_password = self.cleaned_data.get('new_password')
        if new_password:
            user.set_password(new_password)
        if commit:
            user.save()
        return user
