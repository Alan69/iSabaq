"""
Curriculum models for EduDesk.
Data source: Kazakhstan ГОСО / учебные программы
https://adilet.zan.kz/kaz/docs/V2200029767

Hierarchy:
  SubjectArea → Subject → Grade → Quarter
                                     → LongTermPlanSection (Раздел долгосрочного плана)
                                          → Topic (Тема урока)
                                               → LearningObjective (Цель обучения)

Reference models (used in lesson generation params):
  LessonType, LessonModel, TeachingMethodology, LessonOrganizationForm
"""
from django.db import models
from django_ckeditor_5.fields import CKEditor5Field as RichTextField


LANGUAGE_CHOICES = [
    ('ru', 'Русский'),
    ('kk', 'Казахский'),
    ('en', 'Английский'),
]


# ---------------------------------------------------------------------------
# Справочники для параметров генерации
# ---------------------------------------------------------------------------

class LessonType(models.Model):
    """Тип урока: Комбинированный, Новый материал, Закрепление и т.д."""
    name = models.CharField(max_length=200, unique=True, verbose_name='Название')
    description = RichTextField(blank=True, verbose_name='Описание')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Тип урока'
        verbose_name_plural = 'Типы уроков'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class LessonModel(models.Model):
    """Модель урока: 5E, Перевёрнутый класс, CLIL и т.д."""
    name = models.CharField(max_length=200, unique=True, verbose_name='Название')
    description = RichTextField(blank=True, verbose_name='Описание')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Модель урока'
        verbose_name_plural = 'Модели урока'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class TeachingMethodology(models.Model):
    """Методика обучения: Активное обучение, Проблемное обучение и т.д."""
    name = models.CharField(max_length=200, unique=True, verbose_name='Название')
    description = RichTextField(blank=True, verbose_name='Описание')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Методика обучения'
        verbose_name_plural = 'Методики обучения'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class LessonOrganizationForm(models.Model):
    """Форма организации урока: Индивидуальная, Групповая, Парная."""
    name = models.CharField(max_length=200, unique=True, verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Форма организации урока'
        verbose_name_plural = 'Формы организации урока'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Учебная программа / Curriculum
# ---------------------------------------------------------------------------

class SubjectArea(models.Model):
    """Образовательная область: Математика и информатика, Языки и т.д."""
    name_ru = models.CharField(max_length=300, verbose_name='Название (рус)')
    name_kk = models.CharField(max_length=300, blank=True, verbose_name='Название (каз)')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Образовательная область'
        verbose_name_plural = 'Образовательные области'
        ordering = ['order', 'name_ru']

    def __str__(self):
        return self.name_ru


class Subject(models.Model):
    """Учебный предмет: Математика, История Казахстана и т.д."""
    area = models.ForeignKey(
        SubjectArea, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='subjects', verbose_name='Образовательная область'
    )
    name_ru = models.CharField(max_length=300, verbose_name='Название (рус)')
    name_kk = models.CharField(max_length=300, blank=True, verbose_name='Название (каз)')
    name_en = models.CharField(max_length=300, blank=True, verbose_name='Название (eng)')
    code = models.CharField(max_length=50, blank=True, verbose_name='Код предмета')
    description = RichTextField(blank=True, verbose_name='Описание')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Предмет'
        verbose_name_plural = 'Предметы'
        ordering = ['order', 'name_ru']

    def __str__(self):
        return self.name_ru


class GradeLevel(models.Model):
    """Уровень класса: 1, 2, … 11."""
    number = models.PositiveSmallIntegerField(unique=True, verbose_name='Номер класса')
    label_ru = models.CharField(max_length=50, blank=True, verbose_name='Подпись (рус)', help_text='Напр. «5 класс»')
    label_kk = models.CharField(max_length=50, blank=True, verbose_name='Подпись (каз)')

    class Meta:
        verbose_name = 'Класс'
        verbose_name_plural = 'Классы'
        ordering = ['number']

    def __str__(self):
        return self.label_ru or f"{self.number} класс"


class Quarter(models.Model):
    """Учебная четверть: 1, 2, 3, 4."""
    number = models.PositiveSmallIntegerField(verbose_name='Номер четверти')
    label_ru = models.CharField(max_length=50, blank=True, verbose_name='Подпись (рус)')
    label_kk = models.CharField(max_length=50, blank=True, verbose_name='Подпись (каз)')

    class Meta:
        verbose_name = 'Четверть'
        verbose_name_plural = 'Четверти'
        ordering = ['number']

    def __str__(self):
        return self.label_ru or f"{self.number} четверть"


class LongTermPlanSection(models.Model):
    """
    Раздел долгосрочного плана (Ұзақ мерзімді жоспар бөлімі).
    Привязан к предмету, классу и четверти.
    """
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name='sections',
        verbose_name='Предмет'
    )
    grade = models.ForeignKey(
        GradeLevel, on_delete=models.CASCADE, related_name='sections',
        verbose_name='Класс'
    )
    quarter = models.ForeignKey(
        Quarter, on_delete=models.CASCADE, related_name='sections',
        verbose_name='Четверть'
    )
    language = models.CharField(
        max_length=5, choices=LANGUAGE_CHOICES, default='ru',
        verbose_name='Язык обучения'
    )
    name_ru = models.CharField(max_length=500, verbose_name='Название раздела (рус)')
    name_kk = models.CharField(max_length=500, blank=True, verbose_name='Название раздела (каз)')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')
    hours = models.PositiveSmallIntegerField(default=0, verbose_name='Кол-во часов')

    class Meta:
        verbose_name = 'Раздел долгосрочного плана'
        verbose_name_plural = 'Разделы долгосрочного плана'
        ordering = ['grade__number', 'quarter__number', 'order']

    def __str__(self):
        return f"{self.subject} | {self.grade} | {self.quarter.label_ru or self.quarter.number}ч | {self.name_ru[:60]}"


class Topic(models.Model):
    """
    Тема урока (Сабақтың тақырыбы).
    Входит в раздел долгосрочного плана.
    """
    section = models.ForeignKey(
        LongTermPlanSection, on_delete=models.CASCADE, related_name='topics',
        verbose_name='Раздел долгосрочного плана'
    )
    name_ru = models.CharField(max_length=500, verbose_name='Название темы (рус)')
    name_kk = models.CharField(max_length=500, blank=True, verbose_name='Название темы (каз)')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')
    hours = models.PositiveSmallIntegerField(default=1, verbose_name='Кол-во часов')

    class Meta:
        verbose_name = 'Тема урока'
        verbose_name_plural = 'Темы уроков'
        ordering = ['section', 'order']

    def __str__(self):
        return f"{self.name_ru[:80]}"


class LearningObjective(models.Model):
    """
    Цель обучения (Оқыту мақсаты).
    Код формата: 5.1.1.1 (класс.раздел.подраздел.номер)
    """
    topic = models.ForeignKey(
        Topic, on_delete=models.CASCADE, related_name='objectives',
        verbose_name='Тема'
    )
    code = models.CharField(
        max_length=30, verbose_name='Код цели обучения',
        help_text='Напр. 5.1.1.1'
    )
    text_ru = models.TextField(verbose_name='Текст цели обучения (рус)')
    text_kk = models.TextField(blank=True, verbose_name='Текст цели обучения (каз)')
    bloom_level = models.CharField(
        max_length=30, blank=True,
        verbose_name='Уровень таксономии Блума',
        help_text='remembering / understanding / applying / analyzing / evaluating / creating'
    )
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Цель обучения'
        verbose_name_plural = 'Цели обучения'
        ordering = ['topic', 'order', 'code']

    def __str__(self):
        return f"{self.code} — {self.text_ru[:100]}"


class LexicalSection(models.Model):
    """
    Лексический раздел (для языковых предметов).
    share_subject из промпта.
    """
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name='lexical_sections',
        verbose_name='Предмет'
    )
    grade = models.ForeignKey(
        GradeLevel, on_delete=models.CASCADE, related_name='lexical_sections',
        verbose_name='Класс'
    )
    quarter = models.ForeignKey(
        Quarter, on_delete=models.CASCADE, related_name='lexical_sections',
        verbose_name='Четверть'
    )
    name_ru = models.CharField(max_length=500, verbose_name='Лексический раздел (рус)')
    name_kk = models.CharField(max_length=500, blank=True, verbose_name='Лексический раздел (каз)')

    class Meta:
        verbose_name = 'Лексический раздел'
        verbose_name_plural = 'Лексические разделы'

    def __str__(self):
        return f"{self.subject} | {self.grade} | {self.name_ru[:60]}"


class EducationActivityType(models.Model):
    """
    Вид учебной деятельности (education_type из промпта).
    """
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name='activity_types',
        verbose_name='Предмет', null=True, blank=True
    )
    name_ru = models.CharField(max_length=300, verbose_name='Вид деятельности (рус)')
    name_kk = models.CharField(max_length=300, blank=True, verbose_name='Вид деятельности (каз)')

    class Meta:
        verbose_name = 'Вид учебной деятельности'
        verbose_name_plural = 'Виды учебной деятельности'
        ordering = ['name_ru']

    def __str__(self):
        return self.name_ru
