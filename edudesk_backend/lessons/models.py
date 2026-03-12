from django.db import models
from django.contrib.auth.models import User


def lesson_image_upload_path(instance, filename):
    return f"lesson_images/lesson_{instance.lesson_plan_id}_{instance.kind}_{instance.index or 0}_{filename}"


class LessonPlan(models.Model):
    TOOL_TYPE_CHOICES = [
        ('lesson_plan', 'План урока'),
        ('sor_soch', 'СОР/СОЧ'),
        ('formative', 'Формативное оценивание'),
        ('structural', 'Структурные задания'),
        ('presentation', 'Презентация'),
        ('feedback', 'Обратная связь'),
        ('organizer', 'Органайзер'),
        ('game', 'Игра'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lessons', null=True, blank=True)
    title = models.CharField(max_length=255)
    subject = models.CharField(max_length=100)
    grade = models.CharField(max_length=50)
    language = models.CharField(max_length=50, default='Русский')
    tool_type = models.CharField(max_length=30, choices=TOOL_TYPE_CHOICES, default='lesson_plan')
    content = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.grade})"


class LessonPlanImage(models.Model):
    """Сгенерированные картинки к плану урока: слайды и этапы хода урока."""
    KIND_STEP = 'step'
    KIND_SLIDE = 'slide'
    KIND_CHOICES = [(KIND_STEP, 'Этап урока'), (KIND_SLIDE, 'Слайд')]

    lesson_plan = models.ForeignKey(
        LessonPlan,
        on_delete=models.CASCADE,
        related_name='images'
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    index = models.PositiveSmallIntegerField(default=0)
    prompt_text = models.TextField(blank=True)
    image = models.ImageField(upload_to=lesson_image_upload_path, blank=True, null=True)

    class Meta:
        ordering = ['kind', 'index']
        unique_together = [['lesson_plan', 'kind', 'index']]

    def __str__(self):
        return f"{self.lesson_plan_id} {self.kind}[{self.index}]"
