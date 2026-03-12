"""
Management command to seed reference data for lesson generation parameters.
Run: python manage.py load_reference_data
"""
from django.core.management.base import BaseCommand
from curriculum.models import (
    LessonType, LessonModel, TeachingMethodology, LessonOrganizationForm,
    GradeLevel, Quarter,
)


LESSON_TYPES = [
    'Комбинированный урок',
    'Урок изучения нового материала',
    'Урок закрепления знаний',
    'Урок повторения и обобщения',
    'Урок контроля знаний',
    'Урок коррекции знаний',
    'Урок-экскурсия',
    'Урок-практикум',
    'Урок-проект',
    'Урок-дискуссия',
    'Урок-игра',
    'Интегрированный урок',
]

LESSON_MODELS = [
    ('5E Модель', 'Engage → Explore → Explain → Elaborate → Evaluate'),
    ('Перевёрнутый класс', 'Теория дома, практика в классе'),
    ('CLIL', 'Content and Language Integrated Learning'),
    ('Проблемное обучение', 'Problem-Based Learning (PBL)'),
    ('Проектное обучение', 'Project-Based Learning'),
    ('Смешанное обучение', 'Blended Learning'),
    ('Исследовательское обучение', 'Inquiry-Based Learning'),
    ('Кооперативное обучение', 'Cooperative Learning'),
    ('Дифференцированное обучение', 'Differentiated Instruction'),
    ('Геймификация', 'Gamification'),
]

METHODOLOGIES = [
    'Активное обучение',
    'Критическое мышление',
    'Развитие функциональной грамотности',
    'Технология развития критического мышления через чтение и письмо (ТРКМЧП)',
    'Обучение на основе компетенций',
    'Коллаборативное обучение',
    'Метод кейсов',
    'STEM-образование',
    'Формирующее оценивание',
]

ORGANIZATION_FORMS = [
    'Индивидуальная',
    'Парная',
    'Групповая',
    'Фронтальная',
    'Смешанная',
]


class Command(BaseCommand):
    help = 'Seed reference data: lesson types, models, methodologies, organization forms, grades, quarters'

    def handle(self, *args, **options):
        self._load_lesson_types()
        self._load_lesson_models()
        self._load_methodologies()
        self._load_organization_forms()
        self._load_grades()
        self._load_quarters()
        self.stdout.write(self.style.SUCCESS('Reference data loaded successfully.'))

    def _load_lesson_types(self):
        for i, name in enumerate(LESSON_TYPES):
            obj, created = LessonType.objects.get_or_create(name=name, defaults={'order': i})
            if created:
                self.stdout.write(f'  [+] LessonType: {name}')

    def _load_lesson_models(self):
        for i, (name, desc) in enumerate(LESSON_MODELS):
            obj, created = LessonModel.objects.get_or_create(name=name, defaults={'description': desc, 'order': i})
            if created:
                self.stdout.write(f'  [+] LessonModel: {name}')

    def _load_methodologies(self):
        for i, name in enumerate(METHODOLOGIES):
            obj, created = TeachingMethodology.objects.get_or_create(name=name, defaults={'order': i})
            if created:
                self.stdout.write(f'  [+] Methodology: {name}')

    def _load_organization_forms(self):
        for i, name in enumerate(ORGANIZATION_FORMS):
            obj, created = LessonOrganizationForm.objects.get_or_create(name=name, defaults={'order': i})
            if created:
                self.stdout.write(f'  [+] OrganizationForm: {name}')

    def _load_grades(self):
        for n in range(1, 12):
            obj, created = GradeLevel.objects.get_or_create(
                number=n,
                defaults={'label_ru': f'{n} класс', 'label_kk': f'{n} сынып'},
            )
            if created:
                self.stdout.write(f'  [+] Grade: {n}')

    def _load_quarters(self):
        quarters_ru = ['1 четверть', '2 четверть', '3 четверть', '4 четверть']
        quarters_kk = ['1 тоқсан', '2 тоқсан', '3 тоқсан', '4 тоқсан']
        for n in range(1, 5):
            obj, created = Quarter.objects.get_or_create(
                number=n,
                defaults={'label_ru': quarters_ru[n - 1], 'label_kk': quarters_kk[n - 1]},
            )
            if created:
                self.stdout.write(f'  [+] Quarter: {n}')
