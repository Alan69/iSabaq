from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=50, default='Teacher')
    balance = models.IntegerField(default=1000)

    def __str__(self):
        return f"{self.user.username} - {self.role}"
