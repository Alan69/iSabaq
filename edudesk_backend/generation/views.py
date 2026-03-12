"""
Генерация контента по ТЗ EduDesk.pdf — 6 независимых инструментов.
Каждый инструмент: отдельный эндпоинт, свой промпт, сохранение в LessonPlan с tool_type.
"""
import base64
import json
import logging

from django.conf import settings
from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from google import genai
from google.genai import types
from google.genai.errors import ClientError

from lessons.models import LessonPlan, LessonPlanImage
from lessons.serializers import LessonPlanSerializer

logger = logging.getLogger(__name__)

GEMINI_MODEL = 'gemini-2.5-flash'
MAX_OUTPUT_TOKENS = 65536

GEN_CONFIG = types.GenerateContentConfig(
    max_output_tokens=MAX_OUTPUT_TOKENS,
    temperature=1.0,
    top_p=0.95,
    top_k=64,
)
GEN_CONFIG_JSON = types.GenerateContentConfig(
    max_output_tokens=MAX_OUTPUT_TOKENS,
    temperature=0.8,
    top_p=0.95,
    top_k=48,
)

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _strip_json_block(text):
    text = (text or '').strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text.split("```", 1)[-1].strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    return text


def _build_user_context_block(data):
    parts = []
    links = data.get('links')
    if isinstance(links, list) and links:
        parts.append("Ссылки, добавленные пользователем:\n" + "\n".join(f"- {u}" for u in links[:20]))
    file_contents = data.get('file_contents')
    attached_names = []
    if isinstance(file_contents, list):
        for fc in file_contents[:10]:
            name = fc.get('name') or 'файл'
            text = fc.get('content_text')
            if text:
                snippet = (text[:8000] + "...") if len(text) > 8000 else text
                parts.append(f"Текст из файла «{name}»:\n{snippet}")
            elif fc.get('content_base64'):
                attached_names.append(name)
    if attached_names:
        parts.append("Пользователь также приложил файлы (изображения/другие): " + ", ".join(attached_names))
    if not parts:
        return ""
    return "\n\nДополнительный контекст от пользователя:\n" + "\n\n".join(parts) + "\n\n"


def _image_parts_from_file_contents(file_contents):
    if not isinstance(file_contents, list):
        return []
    parts = []
    for fc in file_contents[:4]:
        mime = (fc.get('mime_type') or '').strip()
        if not mime.startswith('image/'):
            continue
        b64 = fc.get('content_base64')
        if not b64:
            continue
        try:
            raw = base64.b64decode(b64)
            if raw:
                parts.append(types.Part(inline_data=types.Blob(data=raw, mime_type=mime or 'image/png')))
        except Exception:
            continue
    return parts


def _call_gemini_raw(client, prompt, description="generation", config=None, image_parts=None):
    """Call Gemini and return raw text (no JSON parsing). Used for HTML game/organizer generation."""
    cfg = config or GEN_CONFIG
    logger.info("Gemini raw call: %s", description)
    try:
        if image_parts:
            parts = [types.Part(text=prompt)] + image_parts
            contents = [types.Content(role='user', parts=parts)]
        else:
            contents = prompt
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=cfg,
        )
        text = (response.text or '').strip()
        # Strip markdown code fences if present
        if text.startswith("```html"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()
        logger.info("Gemini %s: raw text OK, length=%d", description, len(text))
        return text
    except Exception as e:
        logger.exception("Gemini %s error: %s", description, e)
        return None


def _call_gemini(client, prompt, description="generation", config=None, image_parts=None):
    cfg = config or GEN_CONFIG
    logger.info("Gemini call: %s", description)
    try:
        if image_parts:
            parts = [types.Part(text=prompt)] + image_parts
            contents = [types.Content(role='user', parts=parts)]
        else:
            contents = prompt
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=cfg,
        )
        text = (response.text or '').strip()
        text = _strip_json_block(text)
        out = json.loads(text)
        logger.info("Gemini %s: JSON parsed OK", description)
        return out
    except json.JSONDecodeError as e:
        logger.warning("Gemini %s: JSON parse error: %s", description, e)
        return None
    except Exception as e:
        logger.exception("Gemini %s error: %s", description, e)
        return None


def _get_client():
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or ''
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def _common_params(data):
    return {
        'grade': data.get('grade') or '5 класс',
        'section': data.get('section') or '1 четверть',
        'subject': data.get('subject') or 'Математика',
        'division': data.get('division') or '',
        'topic': (data.get('topic') or '').strip() or 'Урок',
        'learning_obj': data.get('learning_obj') or '',
        'resources': data.get('resources') or '',
        'lesson_type': data.get('lesson_type') or 'Комбинированный',
        'model_type': data.get('model_type') or 'Модель 5E',
        'methodology': data.get('methodology') or 'Интерактивная',
        'form': data.get('form') or 'Групповая',
        'extra_conditions': data.get('extra_conditions') or '',
        'share_subject': data.get('share_subject') or '',
        'education_type': data.get('education_type') or '',
        'language': data.get('language') or 'Русский',
    }


def _save_result(user, title, subject, grade, language, tool_type, content):
    return LessonPlan.objects.create(
        user=user,
        title=title,
        subject=subject,
        grade=grade,
        language=language,
        tool_type=tool_type,
        content=content,
    )


# ---------------------------------------------------------------------------
# Tool 1: План урока
# ---------------------------------------------------------------------------

def _build_lesson_plan_prompt(data):
    p = _common_params(data)
    user_context = _build_user_context_block(data)
    return f"""Ты — опытный педагог средней школы в Казахстане с более чем 10-летним стажем, прекрасно знакомый с ГОСО РК, современными методиками преподавания (КТП, ССП, активные методы), принципами дифференциации и формативного оценивания.

Исходные данные:
1. Класс – {p['grade']}
2. Четверть – {p['section']}
3. Предмет: "{p['subject']}"
4. Раздел долгосрочного плана: "{p['division'] or p['topic'] or 'не указан'}"
5. Тема урока: "{p['topic']}"
6. Цель обучения: "{p['learning_obj']}"
7. Учебные ресурсы: "{p['resources']}"
8. Тип урока: "{p['lesson_type']}"
9. Модель урока: "{p['model_type']}"
10. Методика обучения: "{p['methodology']}"
11. Форма организаций урока: "{p['form']}"
12. Дополнительные условия: "{p['extra_conditions']}"
13. Лексический раздел: {p['share_subject'] or "не указан"}
14. Виды учебной деятельности: {p['education_type'] or "не указаны"}
{user_context}
Твоя задача — создать максимально подробный поурочный план на 45 минут. План должен содержать 10–15 этапов хода урока (организационный момент, цели, актуализация, изложение нового материала, практика, обобщение и рефлексия, домашнее задание и завершение). Для каждого этапа подробно укажи время в минутах, детальные действия педагога и ученика, ресурсы и оценивание.

Сгенерируй поурочный план в формате JSON на языке «{p['language']}». Верни ТОЛЬКО валидный JSON, без markdown и пояснений.

Формат:
{{
  "Раздел": "",
  "Тема_урока": "",
  "Цели_обучения": ["строка", "..."],
  "Цели_урока": ["строка", "..."],
  "Ход_урока": [
    {{ "Этап": "название этапа", "Модель урока": "", "Время": "0-5 мин", "Действия педагога": "", "Действия ученика": "", "Ресурсы": "", "Оценивание": "" }},
    ... (10–15 этапов, подробно)
  ]
}}"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_lesson(request):
    client = _get_client()
    if not client:
        return Response({"error": "GEMINI_API_KEY is not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = request.data
    p = _common_params(data)
    image_parts = _image_parts_from_file_contents(data.get('file_contents'))

    prompt = _build_lesson_plan_prompt(data)
    result = _call_gemini(client, prompt, "lesson_plan", image_parts=image_parts or None)
    if not result or not isinstance(result, dict):
        return Response({"error": "Failed to generate lesson plan"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    result.setdefault('Ход_урока', [])
    result.setdefault('Цели_обучения', [])
    result.setdefault('Цели_урока', [])

    lesson = _save_result(
        user=request.user, title=result.get('Тема_урока') or p['topic'],
        subject=p['subject'], grade=p['grade'], language=p['language'],
        tool_type='lesson_plan', content=result,
    )
    return Response(LessonPlanSerializer(lesson).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Tool 2: СОР/СОЧ (Суммативное оценивание)
# ---------------------------------------------------------------------------

def _build_assessment_prompt(data):
    p = _common_params(data)
    user_context = _build_user_context_block(data)
    bloom_level = data.get('bloom_level') or 'Понимание'
    radio = data.get('radio') or 3
    on_the_sequence = data.get('on_the_sequence') or 2
    cross = data.get('cross') or 2
    bloom_mini = data.get('bloom_mini') or 2
    bloom = data.get('bloom') or 1

    return f"""Ты — опытный педагог с более чем 10-летним стажем, владеющий современными методиками, КТП, ССП и умеющий готовить качественные задания для проверки освоения темы учениками.

Исходные данные:
1. Класс – {p['grade']}
2. Четверть – {p['section']}
3. Предмет: "{p['subject']}"
4. Раздел долгосрочного плана: "{p['division'] or p['topic']}"
5. Тема урока: "{p['topic']}"
6. Цель обучения: "{p['learning_obj']}"
7. Таксономия Блума: "{bloom_level}"
8. Дополнительные условия: "{p['extra_conditions']}"
{user_context}
Блок 1: Тип задания: "Выбор одного правильного ответа из 4-х" — Количество заданий: {radio}
Блок 2: Тип задания: "На правильную последовательность" — Количество заданий: {on_the_sequence}
Блок 3: Тип задания: "На правильное соответствие" — Количество заданий: {cross}
Блок 4: Тип задания: "Открытые задания с коротким ответом" — Количество заданий: {bloom_mini}
Блок 5: Тип задания: "Открытые задания с развернутым ответом" — Количество заданий: {bloom}

К каждому заданию необходимо написать исходный ресурс и обоснование правильного ответа.

Сгенерируй задания с учётом психо-возрастных особенностей учеников {p['grade']} в формате JSON на {p['language']} языке. Верни ТОЛЬКО валидный JSON, без markdown.

Формат:
{{
  "tasks": [
    {{
      "question_type": "Выбор одного правильного ответа из 4-х",
      "question_level": "Легкий/Средний/Сложный",
      "question": "Текст",
      "options": [
        {{"option": "", "is_correct": true/false, "matches": null}}
      ],
      "correct_answer_explanation": "",
      "resource": "",
      "subject": "Раздел",
      "topic": "Тема",
      "vision": "Цель обучения",
      "bloom": "remembering/understanding/applying/analyzing/evaluating/creating"
    }},
    {{
      "question_type": "На правильную последовательность",
      "question_level": "Легкий/Средний/Сложный",
      "question": "Текст",
      "options": [
        {{"option": "text", "is_correct": null, "matches": "1,2,3..."}}
      ],
      "correct_answer_explanation": "",
      "resource": "",
      "subject": "",
      "topic": "",
      "vision": "",
      "bloom": ""
    }},
    {{
      "question_type": "На правильное соответствие",
      "question_level": "Легкий/Средний/Сложный",
      "question": "Текст",
      "options": [
        {{"option": "text", "is_correct": null, "matches": "text"}}
      ],
      "correct_answer_explanation": "",
      "resource": "",
      "subject": "",
      "topic": "",
      "vision": "",
      "bloom": ""
    }},
    {{
      "question_type": "Открытые задания с коротким ответом",
      "question_level": "Легкий/Средний/Сложный",
      "question": "Текст",
      "options": ["Правильный ответ 1"],
      "correct_answer_explanation": "",
      "resource": "",
      "subject": "",
      "topic": "",
      "vision": "",
      "bloom": ""
    }},
    {{
      "question_type": "Открытые задания с развернутым ответом",
      "question_level": "Легкий/Средний/Сложный",
      "question": "Текст",
      "options": ["Дескриптор 1: ...", "Дескриптор 2: ..."],
      "correct_answer_explanation": "",
      "resource": "",
      "subject": "",
      "topic": "",
      "vision": "",
      "bloom": ""
    }}
  ]
}}"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_assessment(request):
    client = _get_client()
    if not client:
        return Response({"error": "GEMINI_API_KEY is not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = request.data
    p = _common_params(data)
    image_parts = _image_parts_from_file_contents(data.get('file_contents'))

    prompt = _build_assessment_prompt(data)
    result = _call_gemini(client, prompt, "sor_soch", config=GEN_CONFIG_JSON, image_parts=image_parts or None)
    if not result or not isinstance(result, dict):
        return Response({"error": "Failed to generate assessment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    result.setdefault('tasks', [])
    lesson = _save_result(
        user=request.user, title=f"СОР/СОЧ — {p['topic']}",
        subject=p['subject'], grade=p['grade'], language=p['language'],
        tool_type='sor_soch', content=result,
    )
    return Response(LessonPlanSerializer(lesson).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Tool 3: Формативное оценивание
# ---------------------------------------------------------------------------

def _build_formative_prompt(data):
    p = _common_params(data)
    user_context = _build_user_context_block(data)

    return f"""Ты — опытный педагог средней школы в Казахстане с более чем 10-летним стажем, владеющий современными методиками формативного оценивания.

Исходные данные:
1. Класс – {p['grade']}
2. Четверть – {p['section']}
3. Предмет: "{p['subject']}"
4. Раздел: "{p['division'] or p['topic']}"
5. Тема урока: "{p['topic']}"
6. Цель обучения: "{p['learning_obj']}"
7. Дополнительные условия: "{p['extra_conditions']}"
{user_context}
Твоя задача — создать набор инструментов формативного оценивания для использования на уроке. Формативное оценивание — это текущая проверка понимания учеников в ходе урока, не для выставления оценок, а для корректировки обучения.

Создай следующие компоненты:
1. Exit Ticket (Выходной билет) — 3-5 коротких вопросов для конца урока
2. Быстрый опрос — 5 вопросов «да/нет» или «верно/неверно» для проверки ключевых понятий
3. Лист самооценки — таблица с критериями, где ученик оценивает себя (могу/пока не могу/нужна помощь)
4. Наблюдательный лист для учителя — критерии наблюдения за работой учеников
5. KWL таблица — шаблон «Знаю / Хочу узнать / Узнал»

Сгенерируй всё в формате JSON на языке «{p['language']}». Верни ТОЛЬКО валидный JSON, без markdown.

Формат:
{{
  "Раздел": "",
  "Тема_урока": "",
  "Цели_обучения": [""],
  "exit_ticket": [
    {{"question": "текст вопроса", "expected_answer": "краткий ответ"}}
  ],
  "quick_poll": [
    {{"statement": "утверждение", "correct": true/false, "explanation": "пояснение"}}
  ],
  "self_assessment": [
    {{"criteria": "критерий", "descriptor_can": "описание уровня 'могу'", "descriptor_partial": "описание уровня 'частично'", "descriptor_need_help": "описание уровня 'нужна помощь'"}}
  ],
  "observation_sheet": [
    {{"criteria": "что наблюдаем", "indicators": "показатели", "notes_template": "шаблон заметок"}}
  ],
  "kwl": {{
    "know_prompts": ["подсказка для колонки 'Знаю'"],
    "want_prompts": ["подсказка для колонки 'Хочу узнать'"],
    "learned_prompts": ["подсказка для колонки 'Узнал'"]
  }}
}}"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_formative(request):
    client = _get_client()
    if not client:
        return Response({"error": "GEMINI_API_KEY is not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = request.data
    p = _common_params(data)
    image_parts = _image_parts_from_file_contents(data.get('file_contents'))

    prompt = _build_formative_prompt(data)
    result = _call_gemini(client, prompt, "formative", config=GEN_CONFIG_JSON, image_parts=image_parts or None)
    if not result or not isinstance(result, dict):
        return Response({"error": "Failed to generate formative assessment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    lesson = _save_result(
        user=request.user, title=f"Формативное оценивание — {p['topic']}",
        subject=p['subject'], grade=p['grade'], language=p['language'],
        tool_type='formative', content=result,
    )
    return Response(LessonPlanSerializer(lesson).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Tool 4: Структурные задания
# ---------------------------------------------------------------------------

def _build_structural_prompt(data):
    p = _common_params(data)
    user_context = _build_user_context_block(data)

    return f"""Ты — опытный педагог средней школы в Казахстане с более чем 10-летним стажем, владеющий дифференцированным обучением, критериальным оцениванием и таксономией Блума.

Исходные данные:
1. Класс – {p['grade']}
2. Четверть – {p['section']}
3. Предмет: "{p['subject']}"
4. Раздел: "{p['division'] or p['topic']}"
5. Тема урока: "{p['topic']}"
6. Цель обучения: "{p['learning_obj']}"
7. Дополнительные условия: "{p['extra_conditions']}"
{user_context}
Твоя задача — создать набор структурных заданий для урока, дифференцированных по 3 уровням сложности (A — базовый, B — средний, C — продвинутый). Каждое задание должно содержать чёткие критерии оценивания (дескрипторы).

Создай:
1. Уровень A (базовый) — 3 задания на знание и понимание (Таксономия Блума: remembering, understanding)
2. Уровень B (средний) — 3 задания на применение и анализ (applying, analyzing)
3. Уровень C (продвинутый) — 2 задания на оценку и создание (evaluating, creating)

Каждое задание включает: текст задания, инструкцию для ученика, критерии оценивания (дескрипторы), максимальный балл, время на выполнение.

Сгенерируй в формате JSON на языке «{p['language']}». Верни ТОЛЬКО валидный JSON, без markdown.

Формат:
{{
  "Раздел": "",
  "Тема_урока": "",
  "Цели_обучения": [""],
  "levels": [
    {{
      "level": "A",
      "level_name": "Базовый",
      "bloom_tags": ["remembering", "understanding"],
      "tasks": [
        {{
          "task_number": 1,
          "task_text": "Текст задания",
          "instruction": "Инструкция для ученика",
          "descriptors": [
            {{"criterion": "описание критерия", "max_score": 1}}
          ],
          "max_score": 3,
          "time_minutes": 5
        }}
      ]
    }},
    {{
      "level": "B",
      "level_name": "Средний",
      "bloom_tags": ["applying", "analyzing"],
      "tasks": [...]
    }},
    {{
      "level": "C",
      "level_name": "Продвинутый",
      "bloom_tags": ["evaluating", "creating"],
      "tasks": [...]
    }}
  ]
}}"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_structural(request):
    client = _get_client()
    if not client:
        return Response({"error": "GEMINI_API_KEY is not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = request.data
    p = _common_params(data)
    image_parts = _image_parts_from_file_contents(data.get('file_contents'))

    prompt = _build_structural_prompt(data)
    result = _call_gemini(client, prompt, "structural", config=GEN_CONFIG_JSON, image_parts=image_parts or None)
    if not result or not isinstance(result, dict):
        return Response({"error": "Failed to generate structural tasks"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    lesson = _save_result(
        user=request.user, title=f"Структурные задания — {p['topic']}",
        subject=p['subject'], grade=p['grade'], language=p['language'],
        tool_type='structural', content=result,
    )
    return Response(LessonPlanSerializer(lesson).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Tool 5: Презентация
# ---------------------------------------------------------------------------

def _build_presentation_prompt(data, reference_plan=None):
    p = _common_params(data)
    user_context = _build_user_context_block(data)

    plan_context = ""
    if reference_plan:
        plan_context = f"\nПоурочный план (используй как основу для презентации):\n{json.dumps(reference_plan, ensure_ascii=False)[:6000]}\n"

    return f"""Ты — опытный педагог с более чем 10-летним стажем, владеющий современными методиками, КТП, ССП и умеющий мастерски проводить уроки.

Исходные данные:
1. Класс – {p['grade']}
2. Четверть – {p['section']}
3. Предмет: "{p['subject']}"
4. Раздел: "{p['division'] or p['topic']}"
5. Тема урока: "{p['topic']}"
6. Цель обучения: "{p['learning_obj']}"
7. Дополнительные условия: "{p['extra_conditions']}"
{user_context}{plan_context}
Основная структура презентации:
1. Вступление и организационный момент — приветствие, мотивация темы, «хук».
2. Цели урока — слайд с учебными целями и критериями оценки.
3. Актуализация знаний — разминочное задание, мозговой штурм, KWL.
4. Изложение нового материала — теория, схемы, иллюстрации.
5. Практика и закрепление — задания, упражнения, групповая работа.
6. Обобщение и рефлексия — выводы, exit tickets, самооценка.
7. Домашнее задание и завершение.

Твоя задача: создать качественную презентацию из 8–12 слайдов. Для каждого слайда: заголовок, развёрнутый контекст, детальное описание иллюстрации.

Сгенерируй в формате JSON на языке «{p['language']}». Верни ТОЛЬКО валидный JSON, без markdown, без latex.

Формат:
{{
  "Раздел": "",
  "Тема_урока": "",
  "Цели_обучения": [],
  "Цели_урока": [],
  "Презентация": [
    {{"Слайд": "Слайд 1", "Заголовок": "", "Контекст": "", "Иллюстрация": "Детальное описание изображения для слайда"}},
    ...
  ]
}}"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_presentation(request):
    client = _get_client()
    if not client:
        return Response({"error": "GEMINI_API_KEY is not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = request.data
    p = _common_params(data)
    image_parts = _image_parts_from_file_contents(data.get('file_contents'))

    reference_plan = None
    ref_id = data.get('reference_plan_id')
    if ref_id:
        try:
            ref = LessonPlan.objects.get(id=ref_id, user=request.user)
            reference_plan = ref.content
        except LessonPlan.DoesNotExist:
            pass

    prompt = _build_presentation_prompt(data, reference_plan)
    result = _call_gemini(client, prompt, "presentation", config=GEN_CONFIG_JSON, image_parts=image_parts or None)
    if not result or not isinstance(result, dict):
        return Response({"error": "Failed to generate presentation"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    result.setdefault('Презентация', [])
    lesson = _save_result(
        user=request.user, title=f"Презентация — {p['topic']}",
        subject=p['subject'], grade=p['grade'], language=p['language'],
        tool_type='presentation', content=result,
    )
    return Response(LessonPlanSerializer(lesson).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Tool 6: Обратная связь
# ---------------------------------------------------------------------------

def _build_feedback_prompt(data, reference_plan=None, reference_assessment=None):
    p = _common_params(data)
    user_context = _build_user_context_block(data)

    plan_ctx = ""
    if reference_plan:
        plan_ctx = f"\nПоурочный план:\n{json.dumps(reference_plan, ensure_ascii=False)[:4000]}\n"

    assessment_ctx = ""
    if reference_assessment:
        assessment_ctx = f"\nРезультаты оценивания:\n{json.dumps(reference_assessment, ensure_ascii=False)[:4000]}\n"

    return f"""Ты — опытный педагог с более чем 10-летним стажем, владеющий современными методиками, КТП, ССП и умеющий мастерски проводить уроки.

Исходные данные:
1. Класс – {p['grade']}
2. Предмет: "{p['subject']}"
3. Тема урока: "{p['topic']}"
4. Цель обучения: "{p['learning_obj']}"
5. Дополнительные условия: "{p['extra_conditions']}"
{user_context}{plan_ctx}{assessment_ctx}
Принципы эффективной обратной связи:
1. Фокус на влиянии, а не на личности — обсуждай влияние урока на учеников.
2. Трёхуровневая структура: Feed Up (куда идём — цели), Feed Back (как идём — что помогло/мешало), Feed Forward (что дальше — конкретные шаги).
3. Диалог, а не отчёт — задавай вопросы для рефлексии.
4. Ориентация на доказательства обучения.
5. Конкретность и наблюдаемость — факты, не абстракции.
6. Одна главная идея для улучшения (1–2 ключевых вектора).
7. Эмпатия и уважение — язык поддержки.
8. Связь с целями учителя.
9. Обратная связь должна вести к действию — варианты для следующего урока.
10. Отмечать успехи — усиливать то, что работает.

Твоя задача: дать качественную обратную связь на основе представленных данных.

Сгенерируй в формате JSON на языке «{p['language']}». Верни ТОЛЬКО валидный JSON, без markdown.

Формат:
{{
  "Раздел": "",
  "Тема_урока": "",
  "Цели_обучения": [],
  "Цели_урока": [],
  "Обратная_связь": [
    {{
      "Принцип": "название принципа",
      "Комментарий": "развёрнутый комментарий"
    }}
  ],
  "Вопросы_для_рефлексии": ["вопрос 1", "вопрос 2"],
  "Рекомендации": ["рекомендация 1", "рекомендация 2"]
}}"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_feedback(request):
    client = _get_client()
    if not client:
        return Response({"error": "GEMINI_API_KEY is not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = request.data
    p = _common_params(data)
    image_parts = _image_parts_from_file_contents(data.get('file_contents'))

    reference_plan = None
    ref_id = data.get('reference_plan_id')
    if ref_id:
        try:
            ref = LessonPlan.objects.get(id=ref_id, user=request.user)
            reference_plan = ref.content
        except LessonPlan.DoesNotExist:
            pass

    reference_assessment = None
    ref_assess_id = data.get('reference_assessment_id')
    if ref_assess_id:
        try:
            ref = LessonPlan.objects.get(id=ref_assess_id, user=request.user)
            reference_assessment = ref.content
        except LessonPlan.DoesNotExist:
            pass

    prompt = _build_feedback_prompt(data, reference_plan, reference_assessment)
    result = _call_gemini(client, prompt, "feedback", config=GEN_CONFIG_JSON, image_parts=image_parts or None)
    if not result or not isinstance(result, dict):
        return Response({"error": "Failed to generate feedback"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    lesson = _save_result(
        user=request.user, title=f"Обратная связь — {p['topic']}",
        subject=p['subject'], grade=p['grade'], language=p['language'],
        tool_type='feedback', content=result,
    )
    return Response(LessonPlanSerializer(lesson).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Tool 8: Игры (12 game types — AI generates a full interactive HTML/JS/CSS page)
# ---------------------------------------------------------------------------


GAME_NAMES = {
    'bingo': 'Бинго',
    'jeopardy': 'Jeopardy',
    'quiz_quiz_trade': 'Quiz Quiz Trade',
    'four_corners': '4 Угла',
    'battleship': 'Морской бой',
    'escape_room': 'Квест-комната',
    'quest_outline': 'Квест',
    'stand_sit': 'Встань/Сядь',
    'this_or_that': 'Это или То?',
    'tic_tac_toe': 'Крестики-нолики',
    'trashketball': 'Трэшкетбол',
    'word_search': 'Поиск слов',
}


GAME_HTML_INSTRUCTIONS = {
    'bingo': """Создай интерактивную игру БИНГО (5×5 карточка).
Требования к HTML-игре:
- 5×5 сетка с 24 словами/терминами по теме + центральная ячейка FREE (отмечена автоматически)
- Кнопки для каждого слова: клик → ячейка отмечается (меняет цвет на оранжевый/зелёный)
- Кнопка "Проверить Бинго" — проверяет горизонталь/вертикаль/диагональ, показывает победу
- Вкладка/секция "Лист ведущего" — список всех слов с подсказками/вопросами для каждого
- Кнопка "Перемешать" — случайный порядок слов на карточке
- Счётчик отмеченных ячеек
""",
    'jeopardy': """Создай интерактивную игру JEOPARDY (Своя Игра).
Требования к HTML-игре:
- 5 тематических категорий × 5 вопросов с баллами (100, 200, 300, 400, 500)
- Интерактивная доска: кнопки с баллами, нажатие открывает вопрос
- При показе вопроса: кнопка "Показать ответ" (скрыт по умолчанию)
- Пройденные вопросы затемняются
- Счётчик очков для 2 команд (Команда А и Команда Б) с кнопками +/- баллов
- Кнопка "Сброс игры"
""",
    'quiz_quiz_trade': """Создай интерактивные КАРТОЧКИ QUIZ QUIZ TRADE (для парного опроса).
Требования к HTML-игре:
- Минимум 16 карточек-флипкарт (переворачивающиеся при клике)
- Лицевая сторона: вопрос/термин
- Обратная сторона: ответ + подсказка
- Кнопка "Следующая карточка" / "Предыдущая"
- Прогресс-бар и счётчик (карточка X из Y)
- Кнопка "Перемешать колоду"
- Режим "Я ответил правильно / неправильно" с финальной статистикой
""",
    'four_corners': """Создай интерактивную игру 4 УГЛА.
Требования к HTML-игре:
- 4 цветных угла (секции) с разными категориями/мнениями
- В каждом углу 3 вопроса для обсуждения
- Таймер для каждого вопроса (например, 60 секунд на обсуждение)
- Кнопка "Следующий вопрос"
- Визуальное отображение 4 углов класса (карта комнаты)
- Счётчик раундов
""",
    'battleship': """Создай полностью функциональную браузерную игру МОРСКОЙ БОЙ с учебными вопросами.
Требования к HTML-игре:
- Две сетки 4×4: поле игрока и поле противника
- Корабли расставляются случайно в начале игры
- Клик по клетке противника → показывается вопрос по теме
- Правильный ответ = попадание (красный), неверный = промах (синий)
- Ход ИИ-противника после каждого хода игрока
- Кнопки "Правильно" / "Неправильно" при проверке ответа
- Счётчик попаданий, кнопка "Новая игра"
""",
    'escape_room': """Создай интерактивную КВЕСТ-КОМНАТУ в браузере.
Требования к HTML-игре:
- 4-5 последовательных этапов/комнат
- Каждый этап: описание сюжета, загадка/задание по теме, поле для ввода ответа
- При правильном ответе: анимация успеха + переход к следующему этапу
- При неверном ответе: подсказка и возможность попробовать снова (до 3 попыток → показать ответ)
- Визуальный прогресс-бар этапов
- Таймер всей квест-комнаты
- Финальный экран победы с временем прохождения
""",
    'quest_outline': """Создай интерактивный КВЕСТ-ПРИКЛЮЧЕНИЕ в браузере.
Требования к HTML-игре:
- 4-5 квестов/заданий с повествовательным нарративом
- Каждый квест: история (красиво оформленный текст), задание (вопрос или задача), кнопки ответа
- RPG-стиль оформления: очки опыта (XP), уровень персонажа, инвентарь наград
- Анимации при переходе между квестами
- Прогресс-карта путешествия
- Финальный экран с итогом прохождения
""",
    'stand_sit': """Создай интерактивную игру ВСТАНЬ/СЯДЬ для класса (режим учителя).
Требования к HTML-игре:
- 20 утверждений (правда/неправда) по теме, по одному на экране
- Большой текст утверждения виден всему классу (fullscreen-friendly)
- Кнопки "Показать ответ" (скрыт до нажатия) + "Следующее утверждение"
- Цветовая индикация: зелёный = верно, красный = неверно
- Объяснение ответа под индикатором
- Счётчик 1/20, прогресс-бар
- Кнопка "Пауза/Продолжить" для контроля темпа учителем
""",
    'this_or_that': """Создай интерактивную игру ЭТО ИЛИ ТО? для класса.
Требования к HTML-игре:
- 15 пар вариантов для выбора, по одной паре на экране
- Две большие кнопки с вариантами А и Б (визуально привлекательные, цветные)
- При выборе: плавная анимация, показ вопроса для обсуждения и связи с темой
- Кнопка "Следующий вопрос"
- Счётчик ответов класса (можно отмечать сколько выбрало А и сколько Б)
- Прогресс-бар
""",
    'tic_tac_toe': """Создай полностью функциональную игру КРЕСТИКИ-НОЛИКИ с учебными вопросами.
Требования к HTML-игре:
- Режим двух игроков (Команда X и Команда O)
- Сетка 3×3, каждая ячейка = вопрос по теме
- При клике на ячейку: всплывает вопрос
- Кнопки "Правильно" (ставит X или O) / "Неправильно" (ход переходит к сопернику)
- Определение победителя (три в ряд)
- Счётчик побед каждой команды
- Кнопка "Новая игра"
""",
    'trashketball': """Создай интерактивную игру ТРЭШКЕТБОЛ для класса (режим учителя/ведущего).
Требования к HTML-игре:
- 20 вопросов по теме с уровнями (лёгкий 1pt, средний 2pt, сложный 3pt)
- Вопросы отображаются по одному, большим шрифтом
- Счётчик очков для 2-4 команд (настраивается)
- При правильном ответе: анимация броска мяча 🏀, добавление очков выбранной команде
- Кнопки команд для добавления очков
- Прогресс вопросов (1/20)
- Финальный экран с победителем
""",
    'word_search': """Создай интерактивный ПОИСК СЛОВ в браузере.
Требования к HTML-игре:
- 5 ключевых слов/терминов по теме, скрытых в сетке букв (12×12 минимум)
- Слова расположены горизонтально, вертикально и по диагонали
- Выделение слов: кликаешь первую и последнюю букву → слово подсвечивается
- Список слов для поиска с определениями (отмечается при нахождении)
- Счётчик найденных слов
- Таймер
- Кнопка "Подсказка" (показывает первую букву слова)
- Задание на сопоставление ниже: термин ↔ определение (drag or click to match)
""",
}


def _build_game_html_prompt(data):
    game_type = data.get('game_type', 'bingo')
    topic = data.get('topic', '')
    learning_objective = data.get('learning_objective', '')
    grade = data.get('grade', '')
    language = data.get('language', 'Русский')

    instructions = GAME_HTML_INSTRUCTIONS.get(game_type, GAME_HTML_INSTRUCTIONS['bingo'])
    type_name = GAME_NAMES.get(game_type, 'Игра')

    obj_line = f'Цель обучения: "{learning_objective}"\n' if learning_objective else ''
    grade_line = f'Класс/уровень: {grade}\n' if grade else ''

    return f"""Ты — эксперт по разработке интерактивных образовательных игр для школ Казахстана.

Создай полноценную интерактивную HTML-игру типа «{type_name}» по учебной теме.

Параметры игры:
- Тема: "{topic}"
{obj_line}{grade_line}
Язык интерфейса и контента: {language}

Требования к HTML-игре:
{instructions}

Технические требования:
1. Один самодостаточный HTML-файл (всё CSS и JS встроено, без внешних зависимостей)
2. Красивый современный дизайн: шрифты Google Fonts (подключить через @import), оранжево-белая цветовая схема (#F97316 — основной), закруглённые углы, тени
3. Адаптивная вёрстка (работает на планшете и ноутбуке)
4. Весь контент (вопросы, ответы, слова) — на языке: {language}, по теме "{topic}"
5. Плавные CSS-анимации для переходов и обратной связи
6. Минимум кода — максимум функциональности, без внешних библиотек
7. СУПЕРАДМИН-КОД: во ВСЕХ местах где игра проверяет ответ пользователя, добавь скрытое условие — если введено ровно "1" (строка "1"), то ответ автоматически считается правильным, независимо от реального ответа. Это должно работать тихо, без визуальных подсказок о существовании кода. Применяется к: полям ввода текста (input/textarea), кнопкам «Правильно/Неправильно», проверке слов и любой другой форме проверки в игре.

Верни ТОЛЬКО чистый HTML-код (от <!DOCTYPE html> до </html>), без объяснений, без markdown, без обёртки в кавычки."""


# ---------------------------------------------------------------------------
# Tool 7: Органайзер (9 graphic organizer types)
# ---------------------------------------------------------------------------

ORGANIZER_NAMES = {
    'kwl': 'KWL-таблица',
    't_chart': 'Т-таблица',
    'venn': 'Диаграмма Венна',
    'frayer': 'Модель Фрейера',
    'concept_map': 'Карта понятий',
    'mind_map': 'Ментальная карта',
    'sequence': 'Последовательность событий',
    'timeline': 'Хронологическая лента',
    'marking_text': 'Аннотирование текста',
}

ORGANIZER_HTML_INSTRUCTIONS = {
    'kwl': """Создай KWL-таблицу (Знаю / Хочу узнать / Узнал).
Структура HTML:
- Заголовок документа с темой урока
- Таблица из 3 колонок: «Знаю (K)» (синяя), «Хочу узнать (W)» (жёлтая), «Узнал (L)» (зелёная)
- В каждой колонке 5–8 пунктов (li) с contentEditable="true"
- Кнопка «+ Добавить строку» под каждой колонкой
- Заполни реальным содержательным контентом по теме""",

    't_chart': """Создай Т-таблицу для сравнения двух аспектов.
Структура HTML:
- Заголовок с темой и подзаголовок с названиями сторон
- Таблица 2 колонки: левая и правая с заголовками, которые contentEditable
- 6–8 строк данных, каждая ячейка contentEditable
- Кнопка «+ Добавить строку»
- Придумай содержательные заголовки колонок (Причины/Следствия, Плюсы/Минусы и т.д.)""",

    'venn': """Создай Диаграмму Венна для сравнения двух понятий.
Структура HTML:
- Заголовок с темой
- Три секции рядом: «Только [Понятие 1]», «Общее», «Только [Понятие 2]»
- Каждая секция — список пунктов с contentEditable
- Кнопка «+ Добавить» в каждой секции
- 4–5 пунктов в крайних секциях, 3–4 в центральной
- Визуально стилизуй как перекрывающиеся круги (CSS border-radius)""",

    'frayer': """Создай Модель Фрейера для ключевого термина.
Структура HTML:
- Центр: термин крупным шрифтом, contentEditable, с рамкой
- 4 квадранта вокруг: Определение, Характеристики, Примеры, Не-примеры
- Каждый квадрант имеет заголовок и список пунктов с contentEditable
- Сетка 2×2 вокруг центрального термина
- Заполни реальным содержательным контентом по теме""",

    'concept_map': """Создай Карту понятий по теме.
Структура HTML:
- Центральное понятие в большом прямоугольнике сверху, contentEditable
- 4–6 узлов-понятий ниже, каждый соединён линией/стрелкой с центром (CSS псевдоэлементы или border)
- Под каждым узлом 2–3 связанные идеи
- Все тексты contentEditable
- Кнопки «+ Добавить узел»""",

    'mind_map': """Создай Ментальную карту по теме.
Структура HTML:
- Центральная идея в круге по центру
- 4–6 главных ветвей, расходящихся из центра (разные цвета)
- Каждая ветвь: название + 3–5 вложенных идей
- Все тексты contentEditable
- Используй flexbox/grid для визуального расположения ветвей вокруг центра""",

    'sequence': """Создай схему Последовательности событий/шагов.
Структура HTML:
- Заголовок последовательности
- 5–8 шагов, пронумерованных, со стрелками между ними (→)
- Каждый шаг: номер + текст описания (contentEditable)
- Кнопка «+ Добавить шаг»
- Горизонтальное ИЛИ вертикальное расположение с чёткими стрелками""",

    'timeline': """Создай Хронологическую ленту.
Структура HTML:
- Горизонтальная линия времени с маркерами событий (или вертикальная)
- 6–10 событий: дата (contentEditable), название (contentEditable), описание (contentEditable)
- Чередующееся расположение событий сверху/снизу от линии
- Кнопка «+ Добавить событие»
- Красивые маркеры (кружки) на линии""",

    'marking_text': """Создай шаблон Аннотирования текста.
Структура HTML:
- Заголовок текста (contentEditable крупным шрифтом)
- Основной текст 3–5 абзацев (contentEditable, с возможностью выделения)
- Боковая панель: «Ключевые фразы и пояснения» — список с contentEditable парами фраза/пояснение
- Раздел «Вопросы для обсуждения» — 5–6 вопросов, contentEditable
- Кнопка «+ Добавить вопрос»""",
}


_WORD_EXPORT_JS = """
function exportToWord() {
    const title = document.querySelector('h1') ? document.querySelector('h1').innerText : 'Органайзер';
    const content = document.getElementById('doc-content').innerHTML;
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #000; padding: 6px 10px; }
  th { background: #f0f0f0; font-weight: bold; }
  h1 { font-size: 16pt; text-align: center; }
  h2 { font-size: 14pt; }
  h3 { font-size: 12pt; }
</style>
</head><body>${content}</body></html>`;
    const blob = new Blob(['\\uFEFF', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title.replace(/[^\\w\\s]/gi, '') + '.doc';
    a.click();
    URL.revokeObjectURL(url);
}
"""


def _build_organizer_html_prompt(data):
    organizer_type = data.get('organizer_type', 'kwl')
    topic = data.get('topic', '')
    learning_objective = data.get('learning_objective', '')
    grade = data.get('grade', '')
    language = data.get('language', 'Русский')
    extra_conditions = data.get('extra_conditions', '')

    instructions = ORGANIZER_HTML_INSTRUCTIONS.get(organizer_type, ORGANIZER_HTML_INSTRUCTIONS['kwl'])
    type_name = ORGANIZER_NAMES.get(organizer_type, 'Органайзер')

    obj_line = f'Цель обучения: "{learning_objective}"\n' if learning_objective else ''
    grade_line = f'Класс/уровень: {grade}\n' if grade else ''
    extra_line = f'Дополнительные условия: "{extra_conditions}"\n' if extra_conditions else ''

    word_export_js = _WORD_EXPORT_JS

    return f"""Ты — ведущий UX/UI-дизайнер и педагогический эксперт. Создай визуально ВЫДАЮЩИЙСЯ, красивый интерактивный HTML-органайзер «{type_name}» по теме.

Параметры:
- Тема: "{topic}"
{obj_line}{grade_line}{extra_line}Язык контента: {language}

Структура органайзера:
{instructions}

═══════════════════════════════════════
ДИЗАЙН — САМОЕ ВАЖНОЕ. Следуй точно:
═══════════════════════════════════════

ШРИФТЫ (подключи через @import в <style>):
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap');
- Заголовки: 'Playfair Display', serif  
- Весь текст: 'Inter', sans-serif

ЦВЕТОВАЯ СХЕМА (строго):
--primary: #F97316;        /* оранжевый основной */
--primary-light: #FFF7ED;  /* оранжевый фон */
--primary-mid: #FDBA74;    /* оранжевый средний */
--accent: #0EA5E9;         /* голубой акцент */
--accent-light: #F0F9FF;
--success: #10B981;        /* зелёный */
--success-light: #ECFDF5;
--purple: #8B5CF6;         /* фиолетовый */
--purple-light: #F5F3FF;
--dark: #1E293B;           /* тёмный текст */
--mid: #64748B;            /* серый текст */
--light: #F8FAFC;          /* светлый фон */
--border: #E2E8F0;         /* граница */
--white: #FFFFFF;

ТУЛБАР (position: fixed, top:0, left:0, right:0, z-index:1000):
- background: white
- border-bottom: 2px solid var(--primary)
- height: 56px, display: flex, align-items: center, padding: 0 24px, gap: 12px
- Логотип: «📚 EduDesk» жирным оранжевым цветом
- Название типа органайзера: badge с фоном var(--primary), белый текст, border-radius: 20px, font-size: 12px
- Кнопка «Скачать Word»: background: var(--primary), color: white, border-radius: 8px, padding: 8px 16px, font-weight: 600, hover: brightness(1.1)
- Кнопка «Печать»: border: 1px solid var(--border), border-radius: 8px, padding: 8px 16px, hover: bg var(--light)
- box-shadow: 0 1px 8px rgba(0,0,0,0.08)

СТРАНИЦА:
- body background: #F1F5F9 (серо-голубой, не белый!)
- padding-top: 72px

ЗАГОЛОВОЧНАЯ КАРТОЧКА (перед контентом):
- background: linear-gradient(135deg, var(--primary) 0%, #FB923C 100%)
- border-radius: 16px, padding: 32px 40px, margin: 24px auto
- max-width: 960px
- Название органайзера: белый, font-family Playfair Display, font-size: 28px
- Тема: белый 85% opacity, font-size: 16px, mt: 8px
- Класс/предмет если указан: белый 70% opacity, font-size: 14px

ОСНОВНОЙ КОНТЕНТ div#doc-content:
- max-width: 960px, margin: 0 auto, padding: 0 24px 48px

КАРТОЧКИ (для каждой секции органайзера):
- background: white
- border-radius: 12px
- box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)
- border: 1px solid var(--border)
- overflow: hidden
Заголовок карточки:
- padding: 14px 20px
- background: var(--primary-light) ИЛИ var(--accent-light) ИЛИ var(--success-light) (чередуй цвета!)
- border-bottom: 2px solid соответствующий цвет
- font-weight: 700, font-size: 14px, uppercase letter-spacing: 0.05em
- Иконка-эмодзи перед текстом (например: 📘 Знаю, ❓ Хочу узнать, ✅ Узнал)
Тело карточки: padding: 16px 20px

СПИСКИ В КАРТОЧКАХ:
- list-style: none, padding: 0, margin: 0
- Каждый li: display flex, align-items: flex-start, gap: 10px, padding: 10px 12px, border-radius: 8px, margin-bottom: 6px
- Bullet: маленький цветной кружок 8px (div с border-radius:50%, background: соответствующий цвет)
- Текст li: contentEditable="true", flex:1, min-height: 20px, outline: none
- hover li: background: var(--light), cursor: text
- Граница при фокусе li: background: var(--primary-light)

КНОПКА «+ Добавить»:
- display: flex, align-items: center, gap: 6px
- background: transparent, border: 1.5px dashed var(--primary-mid)
- border-radius: 8px, padding: 8px 14px, margin-top: 8px
- color: var(--primary), font-size: 13px, cursor: pointer, width: 100%
- hover: background: var(--primary-light)

ТАБЛИЦЫ (для T-chart, Timeline):
- border-collapse: separate, border-spacing: 0
- Заголовок th: background: var(--dark), color: white, padding: 12px 16px, font-weight: 600
- Ячейки td: padding: 12px 16px, border-bottom: 1px solid var(--border), contentEditable
- Чётные строки: background: var(--light)
- hover строки: background: var(--primary-light)

АНИМАЦИИ:
- @keyframes fadeInUp: from opacity:0 translateY(16px) → to opacity:1 translateY(0)
- Каждая карточка: animation: fadeInUp 0.4s ease forwards + animation-delay 0.05s * index

МЕДИА ПЕЧАТЬ:
@media print {{
  .toolbar, .add-btn {{ display: none !important; }}
  body {{ background: white; padding-top: 0; }}
  .card {{ box-shadow: none; border: 1px solid #ccc; break-inside: avoid; }}
}}

РЕДАКТИРОВАНИЕ — ПОДЧЁРКИВАНИЕ ПРИ HOVER:
[contenteditable]:hover {{ text-decoration: underline; text-decoration-style: dashed; text-decoration-color: var(--primary-mid); }}
[contenteditable]:focus {{ text-decoration: none; background: var(--primary-light); border-radius: 4px; padding: 0 2px; }}

Функция exportToWord() — вставь ДОСЛОВНО:
{word_export_js}

ФИНАЛЬНЫЕ ТРЕБОВАНИЯ:
- Весь контент (тексты, заголовки, пункты списков) — реальный, содержательный, по теме «{topic}» на {language}
- НЕ использовать Bootstrap или другие внешние CSS-библиотеки (только Google Fonts)
- Весь CSS в теге <style>, весь JS в теге <script>

Верни ТОЛЬКО чистый HTML-код от <!DOCTYPE html> до </html> без объяснений и markdown."""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_game(request):
    client = _get_client()
    if not client:
        return Response({"error": "GEMINI_API_KEY is not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = request.data
    game_type = data.get('game_type', 'bingo')
    topic = data.get('topic', '').strip()
    grade = data.get('grade', '')
    language = data.get('language', 'Русский')
    subject = data.get('subject', '')
    image_parts = _image_parts_from_file_contents(data.get('file_contents'))

    if not topic:
        return Response({"error": "Поле 'topic' обязательно"}, status=status.HTTP_400_BAD_REQUEST)

    if game_type not in GAME_NAMES:
        return Response({"error": f"Неизвестный тип игры: {game_type}"}, status=status.HTTP_400_BAD_REQUEST)

    html_config = types.GenerateContentConfig(
        max_output_tokens=65536,
        temperature=0.9,
        top_p=0.95,
    )

    prompt = _build_game_html_prompt(data)
    html_code = _call_gemini_raw(client, prompt, f"game_{game_type}", config=html_config, image_parts=image_parts or None)
    if not html_code or len(html_code) < 200:
        return Response({"error": "Failed to generate game HTML"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    type_name = GAME_NAMES.get(game_type, 'Игра')
    title = f"{type_name} — {topic}"

    content = {
        "type": game_type,
        "title": title,
        "topic": topic,
        "html": html_code,
    }

    lesson = _save_result(
        user=request.user, title=title,
        subject=subject or topic, grade=grade, language=language,
        tool_type='game', content=content,
    )
    return Response(LessonPlanSerializer(lesson).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_organizer(request):
    client = _get_client()
    if not client:
        return Response({"error": "GEMINI_API_KEY is not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = request.data
    organizer_type = data.get('organizer_type', 'kwl')
    topic = data.get('topic', '').strip()
    grade = data.get('grade', '')
    language = data.get('language', 'Русский')
    subject = data.get('subject', '')
    image_parts = _image_parts_from_file_contents(data.get('file_contents'))

    if not topic:
        return Response({"error": "Поле 'topic' обязательно"}, status=status.HTTP_400_BAD_REQUEST)

    if organizer_type not in ORGANIZER_NAMES:
        return Response({"error": f"Неизвестный тип органайзера: {organizer_type}"}, status=status.HTTP_400_BAD_REQUEST)

    html_config = types.GenerateContentConfig(
        max_output_tokens=65536,
        temperature=0.7,
        top_p=0.95,
    )

    prompt = _build_organizer_html_prompt(data)
    html_code = _call_gemini_raw(client, prompt, f"organizer_{organizer_type}", config=html_config, image_parts=image_parts or None)
    if not html_code or len(html_code) < 200:
        return Response({"error": "Failed to generate organizer HTML"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    type_name = ORGANIZER_NAMES.get(organizer_type, 'Органайзер')
    title = f"{type_name} — {topic}"

    content = {
        "type": organizer_type,
        "title": title,
        "topic": topic,
        "html": html_code,
    }

    lesson = _save_result(
        user=request.user, title=title,
        subject=subject or topic, grade=grade, language=language,
        tool_type='organizer', content=content,
    )
    return Response(LessonPlanSerializer(lesson).data, status=status.HTTP_201_CREATED)
