from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LessonPlanViewSet

router = DefaultRouter()
router.register(r'history', LessonPlanViewSet, basename='lessonplan')

urlpatterns = [
    path('', include(router.urls)),
]
