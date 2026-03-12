from django.urls import path
from .views import (
    generate_lesson,
    generate_assessment,
    generate_formative,
    generate_structural,
    generate_presentation,
    generate_feedback,
    generate_organizer,
    generate_game,
)

urlpatterns = [
    path('lesson/', generate_lesson, name='generate_lesson'),
    path('assessment/', generate_assessment, name='generate_assessment'),
    path('formative/', generate_formative, name='generate_formative'),
    path('structural/', generate_structural, name='generate_structural'),
    path('presentation/', generate_presentation, name='generate_presentation'),
    path('feedback/', generate_feedback, name='generate_feedback'),
    path('organizer/', generate_organizer, name='generate_organizer'),
    path('game/', generate_game, name='generate_game'),
]
