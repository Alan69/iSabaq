import React, { createContext, useContext, useState, useCallback } from 'react';

export const ORGANIZERS = [
    {
        id: 'kwl',
        name: 'KWL-таблица',
        description: 'Что знаю / Хочу узнать / Узнал — активирует интерес и фиксирует знания.',
        icon: '📋',
        color: 'blue',
    },
    {
        id: 't_chart',
        name: 'Т-таблица',
        description: 'Сравнение двух идей: плюсы/минусы, причины/следствия, категории.',
        icon: '⚖️',
        color: 'purple',
    },
    {
        id: 'venn',
        name: 'Диаграмма Венна',
        description: 'Визуально сравните два понятия — сходства и различия.',
        icon: '🔵',
        color: 'indigo',
    },
    {
        id: 'frayer',
        name: 'Модель Фрейера',
        description: 'Словарная карточка: определение, характеристики, примеры, не-примеры.',
        icon: '🔲',
        color: 'green',
    },
    {
        id: 'concept_map',
        name: 'Карта понятий',
        description: 'Визуально организуйте и свяжите идеи — для глубокого понимания.',
        icon: '🗺️',
        color: 'teal',
    },
    {
        id: 'mind_map',
        name: 'Ментальная карта',
        description: 'Центральная идея с 2–6 ветвями для быстрой организации знаний.',
        icon: '🧠',
        color: 'amber',
    },
    {
        id: 'sequence',
        name: 'Последовательность событий',
        description: 'Расположите события или шаги в логическом порядке.',
        icon: '📊',
        color: 'orange',
    },
    {
        id: 'timeline',
        name: 'Хронологическая лента',
        description: 'Разместите события по времени — укрепляет понимание истории.',
        icon: '📅',
        color: 'red',
    },
    {
        id: 'marking_text',
        name: 'Аннотирование текста',
        description: 'Текст с выделением ключевых фраз и вопросами на понимание.',
        icon: '📝',
        color: 'emerald',
    },
];

export const GAMES = [
    {
        id: 'bingo',
        name: 'Бинго',
        description: 'Создайте карточку 5×5 с ключевыми словами и листом ведущего для проверки темы.',
        icon: '🎯',
        color: 'red',
        featured: true,
    },
    {
        id: 'jeopardy',
        name: 'Jeopardy',
        description: 'Доска Jeopardy: 5 категорий × 5 вопросов с баллами от 100 до 500.',
        icon: '🏆',
        color: 'blue',
        featured: true,
    },
    {
        id: 'quiz_quiz_trade',
        name: 'Quiz Quiz Trade',
        description: 'Карточки для парного опроса: вопрос, ответ и подсказка для партнёра.',
        icon: '🃏',
        color: 'purple',
        featured: true,
    },
    {
        id: 'four_corners',
        name: '4 Угла',
        description: 'Четыре категории с вопросами — ученики перемещаются по классу и обсуждают.',
        icon: '📐',
        color: 'green',
        featured: false,
    },
    {
        id: 'battleship',
        name: 'Морской бой',
        description: 'Сетка вопросов: ответь правильно — «потопи корабль» соперника.',
        icon: '⚓',
        color: 'indigo',
        featured: false,
    },
    {
        id: 'escape_room',
        name: 'Квест-комната',
        description: 'Сценарий квест-комнаты с 4–5 этапами, загадками и решениями по теме.',
        icon: '🔐',
        color: 'amber',
        featured: false,
    },
    {
        id: 'quest_outline',
        name: 'Квест',
        description: 'Приключение с последовательными заданиями — учёба как нарративное путешествие.',
        icon: '⚔️',
        color: 'teal',
        featured: false,
    },
    {
        id: 'stand_sit',
        name: 'Встань/Сядь',
        description: '20 утверждений «верно/неверно» — ученики реагируют движением тела.',
        icon: '🧍',
        color: 'orange',
        featured: false,
    },
    {
        id: 'this_or_that',
        name: 'Это или То?',
        description: '15 пар вариантов для выбора — стимулирует дискуссию и критическое мышление.',
        icon: '🤔',
        color: 'emerald',
        featured: false,
    },
    {
        id: 'tic_tac_toe',
        name: 'Крестики-нолики',
        description: 'Игра 3×3: ответь на вопрос ячейки, чтобы поставить X или O.',
        icon: '❌',
        color: 'red',
        featured: false,
    },
    {
        id: 'trashketball',
        name: 'Трэшкетбол',
        description: '20 вопросов по уровням сложности: правильный ответ = право бросить мяч.',
        icon: '🏀',
        color: 'orange',
        featured: false,
    },
    {
        id: 'word_search',
        name: 'Поиск слов',
        description: '5 ключевых слов с определениями и заданием на сопоставление терминов.',
        icon: '🔤',
        color: 'blue',
        featured: false,
    },
];

export const TOOLS = [
    { id: 'lesson_plan', name: 'План урока', description: 'Генерация подробного поурочного плана по ГОСО.', color: 'orange', badge: 'POPULAR' },
    { id: 'sor_soch', name: 'СОР/СОЧ', description: 'Суммативное оценивание по обновлённой программе.', color: 'blue', badge: null },
    { id: 'formative', name: 'Формативное оценивание', description: 'Диагностика понимания: exit tickets, опросы, самооценка.', color: 'green', badge: null },
    { id: 'structural', name: 'Структурные задания', description: 'Дифференцированные задания по уровням сложности (A/B/C).', color: 'purple', badge: null },
    { id: 'presentation', name: 'Презентация', description: 'Генерация слайдов к уроку с иллюстрациями.', color: 'indigo', badge: null },
    { id: 'feedback', name: 'Обратная связь', description: 'Подробный фидбек по уроку для рефлексии.', color: 'emerald', badge: null },
];

const defaultParams = {
    grade: '',
    section: '',
    subject: '',
    division: '',
    topic: '',
    learning_obj: '',
    resources: '',
    lesson_type: '',
    model_type: '',
    methodology: '',
    form: '',
    extra_conditions: '',
    share_subject: '',
    education_type: '',
    language: '',
};

const defaultAssessmentParams = {
    bloom_level: 'Понимание',
    radio: 3,
    on_the_sequence: 2,
    cross: 2,
    bloom_mini: 2,
    bloom: 1,
};

const LessonParamsContext = createContext(null);

export function LessonParamsProvider({ children }) {
    const [params, setParamsState] = useState(defaultParams);
    const [assessmentParams, setAssessmentParamsState] = useState(defaultAssessmentParams);
    const [selectedTool, setSelectedTool] = useState('lesson_plan');
    const [showParamsModal, setShowParamsModal] = useState(false);

    const setParam = useCallback((key, value) => {
        setParamsState((prev) => ({ ...prev, [key]: value }));
    }, []);

    const setParams = useCallback((updates) => {
        setParamsState((prev) => ({ ...prev, ...updates }));
    }, []);

    const setAssessmentParam = useCallback((key, value) => {
        setAssessmentParamsState((prev) => ({ ...prev, [key]: value }));
    }, []);

    const openParamsModal = useCallback(() => setShowParamsModal(true), []);
    const closeParamsModal = useCallback(() => setShowParamsModal(false), []);

    const value = {
        params,
        setParam,
        setParams,
        assessmentParams,
        setAssessmentParam,
        selectedTool,
        setSelectedTool,
        showParamsModal,
        setShowParamsModal,
        openParamsModal,
        closeParamsModal,
    };

    return (
        <LessonParamsContext.Provider value={value}>
            {children}
        </LessonParamsContext.Provider>
    );
}

export function useLessonParams() {
    const ctx = useContext(LessonParamsContext);
    if (!ctx) {
        throw new Error('useLessonParams must be used within LessonParamsProvider');
    }
    return ctx;
}
