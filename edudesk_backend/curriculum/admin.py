from django.contrib import admin
from django.utils.html import format_html
from .models import (
    SubjectArea, Subject, GradeLevel, Quarter,
    LongTermPlanSection, Topic, LearningObjective,
    LessonType, LessonModel, TeachingMethodology, LessonOrganizationForm,
    LexicalSection, EducationActivityType,
)


# ---------------------------------------------------------------------------
# Inline editors
# ---------------------------------------------------------------------------

class LearningObjectiveInline(admin.TabularInline):
    model = LearningObjective
    extra = 1
    fields = ('code', 'text_ru', 'text_kk', 'bloom_level', 'order')
    ordering = ('order', 'code')


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 1
    fields = ('name_ru', 'name_kk', 'hours', 'order')
    ordering = ('order',)
    show_change_link = True


class SectionInline(admin.TabularInline):
    model = LongTermPlanSection
    extra = 0
    fields = ('quarter', 'grade', 'language', 'name_ru', 'hours', 'order')
    ordering = ('order',)
    show_change_link = True


# ---------------------------------------------------------------------------
# Reference models (справочники)
# ---------------------------------------------------------------------------

@admin.register(LessonType)
class LessonTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    search_fields = ('name',)
    ordering = ('order', 'name')


@admin.register(LessonModel)
class LessonModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    search_fields = ('name',)
    ordering = ('order', 'name')


@admin.register(TeachingMethodology)
class TeachingMethodologyAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    search_fields = ('name',)
    ordering = ('order', 'name')


@admin.register(LessonOrganizationForm)
class LessonOrganizationFormAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    search_fields = ('name',)
    ordering = ('order', 'name')


# ---------------------------------------------------------------------------
# Curriculum hierarchy
# ---------------------------------------------------------------------------

@admin.register(SubjectArea)
class SubjectAreaAdmin(admin.ModelAdmin):
    list_display = ('name_ru', 'name_kk', 'order')
    search_fields = ('name_ru', 'name_kk')
    ordering = ('order', 'name_ru')


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name_ru', 'name_kk', 'area', 'code', 'order')
    list_filter = ('area',)
    search_fields = ('name_ru', 'name_kk', 'code')
    ordering = ('order', 'name_ru')


@admin.register(GradeLevel)
class GradeLevelAdmin(admin.ModelAdmin):
    list_display = ('number', 'label_ru', 'label_kk')
    ordering = ('number',)


@admin.register(Quarter)
class QuarterAdmin(admin.ModelAdmin):
    list_display = ('number', 'label_ru', 'label_kk')
    ordering = ('number',)


@admin.register(LongTermPlanSection)
class LongTermPlanSectionAdmin(admin.ModelAdmin):
    list_display = ('name_ru_short', 'subject', 'grade', 'quarter', 'language', 'hours', 'order')
    list_filter = ('subject', 'grade', 'quarter', 'language')
    search_fields = ('name_ru', 'name_kk')
    ordering = ('subject', 'grade__number', 'quarter__number', 'order')
    inlines = [TopicInline]

    def name_ru_short(self, obj):
        return obj.name_ru[:70]
    name_ru_short.short_description = 'Раздел'


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('name_ru_short', 'section_info', 'hours', 'order')
    list_filter = (
        'section__subject',
        'section__grade',
        'section__quarter',
    )
    search_fields = ('name_ru', 'name_kk')
    ordering = ('section__grade__number', 'section__quarter__number', 'order')
    inlines = [LearningObjectiveInline]

    def name_ru_short(self, obj):
        return obj.name_ru[:80]
    name_ru_short.short_description = 'Тема'

    def section_info(self, obj):
        s = obj.section
        return format_html(
            '<span style="font-size:12px">{} | {} | {}ч</span>',
            s.subject.name_ru,
            s.grade,
            s.quarter.number,
        )
    section_info.short_description = 'Раздел'


@admin.register(LearningObjective)
class LearningObjectiveAdmin(admin.ModelAdmin):
    list_display = ('code', 'text_ru_short', 'bloom_level', 'topic_info')
    list_filter = (
        'topic__section__subject',
        'topic__section__grade',
        'bloom_level',
    )
    search_fields = ('code', 'text_ru', 'text_kk')
    ordering = ('topic__section__grade__number', 'order', 'code')

    def text_ru_short(self, obj):
        return obj.text_ru[:100]
    text_ru_short.short_description = 'Цель обучения'

    def topic_info(self, obj):
        t = obj.topic
        return format_html(
            '<span style="font-size:12px">{} / {}</span>',
            t.section.subject.name_ru,
            t.name_ru[:50],
        )
    topic_info.short_description = 'Тема'


@admin.register(LexicalSection)
class LexicalSectionAdmin(admin.ModelAdmin):
    list_display = ('name_ru', 'subject', 'grade', 'quarter')
    list_filter = ('subject', 'grade', 'quarter')
    search_fields = ('name_ru', 'name_kk')


@admin.register(EducationActivityType)
class EducationActivityTypeAdmin(admin.ModelAdmin):
    list_display = ('name_ru', 'name_kk', 'subject')
    list_filter = ('subject',)
    search_fields = ('name_ru', 'name_kk')
