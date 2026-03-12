from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token

from .models import UserProfile


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if username and password:
        user, created = User.objects.get_or_create(username=username)
        if created:
            user.set_password(password)
            user.save()
            UserProfile.objects.create(user=user, role='Teacher')

        user = authenticate(username=username, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'username': user.username})

    return Response({'error': 'Invalid Credentials'}, status=status.HTTP_400_BAD_REQUEST)
