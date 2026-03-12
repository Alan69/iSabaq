from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubjectViewSet,
    GradeLevelViewSet,
    QuarterViewSet,
    LongTermPlanSectionViewSet,
    TopicViewSet,
    LearningObjectiveViewSet,
    LessonTypeViewSet,
    LessonModelViewSet,
    TeachingMethodologyViewSet,
    LessonOrganizationFormViewSet,
)

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'grades', GradeLevelViewSet, basename='grade')
router.register(r'quarters', QuarterViewSet, basename='quarter')
router.register(r'sections', LongTermPlanSectionViewSet, basename='section')
router.register(r'topics', TopicViewSet, basename='topic')
router.register(r'objectives', LearningObjectiveViewSet, basename='objective')
router.register(r'lesson-types', LessonTypeViewSet, basename='lesson-type')
router.register(r'lesson-models', LessonModelViewSet, basename='lesson-model')
router.register(r'methodologies', TeachingMethodologyViewSet, basename='methodology')
router.register(r'organization-forms', LessonOrganizationFormViewSet, basename='organization-form')

urlpatterns = [
    path('', include(router.urls)),
]
