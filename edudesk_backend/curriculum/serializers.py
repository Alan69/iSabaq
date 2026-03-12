from rest_framework import serializers
from .models import (
    SubjectArea, Subject, GradeLevel, Quarter,
    LongTermPlanSection, Topic, LearningObjective,
    LessonType, LessonModel, TeachingMethodology, LessonOrganizationForm,
)


class SubjectAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectArea
        fields = ['id', 'name_ru', 'name_kk', 'order']


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name_ru', 'name_kk', 'name_en', 'code', 'area', 'order']


class GradeLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeLevel
        fields = ['id', 'number', 'label_ru', 'label_kk']


class QuarterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quarter
        fields = ['id', 'number', 'label_ru', 'label_kk']


class LearningObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningObjective
        fields = ['id', 'code', 'text_ru', 'text_kk', 'bloom_level', 'order']


class TopicSerializer(serializers.ModelSerializer):
    objectives = LearningObjectiveSerializer(many=True, read_only=True)

    class Meta:
        model = Topic
        fields = ['id', 'name_ru', 'name_kk', 'hours', 'order', 'objectives']


class LongTermPlanSectionSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True, read_only=True)

    class Meta:
        model = LongTermPlanSection
        fields = [
            'id', 'subject', 'grade', 'quarter', 'language',
            'name_ru', 'name_kk', 'hours', 'order', 'topics',
        ]


class LessonTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonType
        fields = ['id', 'name', 'order']


class LessonModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonModel
        fields = ['id', 'name', 'order']


class TeachingMethodologySerializer(serializers.ModelSerializer):
    class Meta:
        model = TeachingMethodology
        fields = ['id', 'name', 'order']


class LessonOrganizationFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonOrganizationForm
        fields = ['id', 'name', 'order']
