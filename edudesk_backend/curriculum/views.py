from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from .models import (
    Subject, GradeLevel, Quarter,
    LongTermPlanSection, Topic, LearningObjective,
    LessonType, LessonModel, TeachingMethodology, LessonOrganizationForm,
)
from .serializers import (
    SubjectSerializer, GradeLevelSerializer, QuarterSerializer,
    LongTermPlanSectionSerializer, TopicSerializer, LearningObjectiveSerializer,
    LessonTypeSerializer, LessonModelSerializer,
    TeachingMethodologySerializer, LessonOrganizationFormSerializer,
)


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Subject.objects.all().order_by('order', 'name_ru')
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name_ru', 'name_kk']


class GradeLevelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GradeLevel.objects.all().order_by('number')
    serializer_class = GradeLevelSerializer
    permission_classes = [IsAuthenticated]


class QuarterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Quarter.objects.all().order_by('number')
    serializer_class = QuarterSerializer
    permission_classes = [IsAuthenticated]


class LongTermPlanSectionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LongTermPlanSectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = LongTermPlanSection.objects.select_related(
            'subject', 'grade', 'quarter'
        ).prefetch_related('topics__objectives')
        subject = self.request.query_params.get('subject')
        grade = self.request.query_params.get('grade')
        quarter = self.request.query_params.get('quarter')
        language = self.request.query_params.get('language')
        if subject:
            qs = qs.filter(subject_id=subject)
        if grade:
            qs = qs.filter(grade_id=grade)
        if quarter:
            qs = qs.filter(quarter_id=quarter)
        if language:
            qs = qs.filter(language=language)
        return qs.order_by('grade__number', 'quarter__number', 'order')


class TopicViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Topic.objects.select_related('section__subject', 'section__grade', 'section__quarter')
        section = self.request.query_params.get('section')
        if section:
            qs = qs.filter(section_id=section)
        return qs.order_by('order')


class LearningObjectiveViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LearningObjectiveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = LearningObjective.objects.select_related('topic')
        topic = self.request.query_params.get('topic')
        if topic:
            qs = qs.filter(topic_id=topic)
        return qs.order_by('order', 'code')


class LessonTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LessonType.objects.all().order_by('order', 'name')
    serializer_class = LessonTypeSerializer
    permission_classes = [IsAuthenticated]


class LessonModelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LessonModel.objects.all().order_by('order', 'name')
    serializer_class = LessonModelSerializer
    permission_classes = [IsAuthenticated]


class TeachingMethodologyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TeachingMethodology.objects.all().order_by('order', 'name')
    serializer_class = TeachingMethodologySerializer
    permission_classes = [IsAuthenticated]


class LessonOrganizationFormViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LessonOrganizationForm.objects.all().order_by('order', 'name')
    serializer_class = LessonOrganizationFormSerializer
    permission_classes = [IsAuthenticated]
