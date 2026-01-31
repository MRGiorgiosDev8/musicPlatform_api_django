from django.shortcuts import render

def index(request):
    """Страница поиска"""
    return render(request, 'index.html')