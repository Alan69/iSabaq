from rest_framework import serializers
from .models import LessonPlan


class LessonPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlan
        fields = '__all__'
        read_only_fields = ('user', 'created_at')
