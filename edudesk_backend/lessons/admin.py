from django.contrib import admin
from .models import LessonPlan, LessonPlanImage


@admin.register(LessonPlanImage)
class LessonPlanImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'lesson_plan', 'kind', 'index', 'prompt_preview')
    list_filter = ('kind',)

    def prompt_preview(self, obj):
        return (obj.prompt_text[:50] + '...') if obj.prompt_text and len(obj.prompt_text) > 50 else (obj.prompt_text or '')


admin.site.register(LessonPlan)
