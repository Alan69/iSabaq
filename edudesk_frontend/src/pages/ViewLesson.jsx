import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLesson, downloadLessonExport, deleteLesson } from '../services/api';
import { TOOLS, ORGANIZERS, GAMES } from '../context/LessonParamsContext';

const TOOL_TYPE_LABELS = {
    ...Object.fromEntries(TOOLS.map(t => [t.id, t.name])),
    organizer: 'Органайзер',
    game: 'Игра',
};
const ORGANIZER_NAMES = Object.fromEntries(ORGANIZERS.map(o => [o.id, o.name]));
const GAME_NAMES = Object.fromEntries(GAMES.map(g => [g.id, g.name]));

export default function ViewLesson() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getLesson(id);
                if (!cancelled) setLesson(data);
            } catch (err) {
                if (!cancelled) setError(err.response?.status === 404 ? 'Не найдено' : 'Ошибка загрузки');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm('Удалить?')) return;
        try { await deleteLesson(id); navigate('/history'); } catch (err) { console.error(err); }
    };

    const handleExport = async () => {
        try {
            const name = (lesson.title || 'result').replace(/[^\w\s-]/g, '').slice(0, 40);
            await downloadLessonExport(id, `${lesson.tool_type || 'plan'}_${name}.docx`);
        } catch (err) {
            console.error(err);
            alert(err.message || 'Не удалось скачать Word.');
        }
    };

    if (loading) {
        return <main className="flex-1 overflow-y-auto p-8 flex items-center justify-center bg-slate-50"><p className="text-slate-500 font-medium">Загрузка...</p></main>;
    }
    if (error || !lesson) {
        return (
            <main className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center bg-slate-50">
                <p className="text-red-600 font-medium mb-4">{error || 'Не найдено'}</p>
                <button onClick={() => navigate('/history')} className="px-4 py-2 bg-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-300">К истории</button>
            </main>
        );
    }

    const content = lesson.content || {};
    const toolType = lesson.tool_type || 'lesson_plan';
    const toolLabel = TOOL_TYPE_LABELS[toolType] || toolType;

    return (
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 grid-pattern">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-slate-800">{content['Тема_урока'] || content.title || lesson.title}</h1>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">{toolLabel}</span>
                        </div>
                        <p className="text-slate-500">
                            {content['Раздел'] && <span className="mr-4">Раздел: {content['Раздел']}</span>}
                            <span>{lesson.grade} &middot; {lesson.subject}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm flex items-center gap-2" title="Скачать Word">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span className="text-sm font-medium">Скачать</span>
                        </button>
                        <button onClick={() => navigate('/history')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-all shadow-sm" title="К истории">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <button onClick={handleDelete} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-200 transition-all shadow-sm" title="Удалить">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>

                {/* Goals (shared across types) */}
                <GoalsSection content={content} />

                {/* Type-specific content */}
                <div className="space-y-8 mt-8">
                    {toolType === 'lesson_plan' && <LessonPlanContent content={content} />}
                    {toolType === 'sor_soch' && <AssessmentContent content={content} />}
                    {toolType === 'formative' && <FormativeContent content={content} />}
                    {toolType === 'structural' && <StructuralContent content={content} />}
                    {toolType === 'presentation' && <PresentationContent content={content} />}
                    {toolType === 'feedback' && <FeedbackContent content={content} />}
                    {toolType === 'organizer' && <OrganizerContent content={content} />}
                    {toolType === 'game' && <GameContent content={content} />}
                </div>
            </div>
        </main>
    );
}

function GoalsSection({ content }) {
    const goalsLearn = content['Цели_обучения'] || [];
    const goalsLesson = content['Цели_урока'] || [];
    if (!goalsLearn.length && !goalsLesson.length) return null;

    return (
        <div className="space-y-4">
            {goalsLearn.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-3">Цели обучения</h2>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {goalsLearn.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                </section>
            )}
            {goalsLesson.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-3">Цели урока</h2>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {goalsLesson.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                </section>
            )}
        </div>
    );
}

/* ---- Tool 1: План урока ---- */
function LessonPlanContent({ content }) {
    const hod = content['Ход_урока'] || [];
    if (!hod.length) return <EmptyContent />;

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 p-6 pb-0">Ход урока</h2>
            <div className="overflow-x-auto p-6">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="py-3 px-4 font-bold text-slate-600">Этап / Время</th>
                            <th className="py-3 px-4 font-bold text-slate-600">Модель урока</th>
                            <th className="py-3 px-4 font-bold text-slate-600">Действия педагога</th>
                            <th className="py-3 px-4 font-bold text-slate-600">Действия ученика</th>
                            <th className="py-3 px-4 font-bold text-slate-600">Ресурсы</th>
                            <th className="py-3 px-4 font-bold text-slate-600">Оценивание</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hod.map((step, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">{step['Этап']} {step['Время']}</td>
                                <td className="py-3 px-4 text-slate-600">{step['Модель урока']}</td>
                                <td className="py-3 px-4 text-slate-700">{step['Действия педагога']}</td>
                                <td className="py-3 px-4 text-slate-700">{step['Действия ученика']}</td>
                                <td className="py-3 px-4 text-slate-600">{step['Ресурсы']}</td>
                                <td className="py-3 px-4 text-slate-600">{step['Оценивание']}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/* ---- Tool 2: СОР/СОЧ ---- */
function AssessmentContent({ content }) {
    const tasks = content['tasks'] || [];
    if (!tasks.length) return <EmptyContent />;

    const grouped = {};
    tasks.forEach(t => {
        const type = t.question_type || 'Другое';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(t);
    });

    return (
        <>
            {Object.entries(grouped).map(([type, items]) => (
                <section key={type} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">{type}</h2>
                    <div className="space-y-6">
                        {items.map((task, i) => (
                            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                        task.question_level === 'Легкий' ? 'bg-green-100 text-green-700' :
                                        task.question_level === 'Средний' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>{task.question_level}</span>
                                    {task.bloom && <span className="text-xs text-slate-500">{task.bloom}</span>}
                                </div>
                                <p className="font-medium text-slate-800 mb-2">{task.question}</p>
                                <ul className="space-y-1.5 mb-3">
                                    {(task.options || []).map((opt, j) => {
                                        if (typeof opt === 'string') return <li key={j} className="pl-3 py-1 text-slate-700">{opt}</li>;
                                        const isCorrect = opt.is_correct === true || opt.is_correct === 'true';
                                        return (
                                            <li key={j} className={`pl-3 py-1 rounded ${isCorrect ? 'bg-emerald-100 text-emerald-800 font-medium' : 'text-slate-700'}`}>
                                                {opt.option || opt}
                                                {opt.matches && <span className="ml-2 text-xs text-slate-500">→ {opt.matches}</span>}
                                                {isCorrect && <span className="ml-2 text-emerald-600">&#10003;</span>}
                                            </li>
                                        );
                                    })}
                                </ul>
                                {task.correct_answer_explanation && (
                                    <p className="text-sm text-slate-600 border-t border-slate-200 pt-3"><strong>Обоснование:</strong> {task.correct_answer_explanation}</p>
                                )}
                                {task.resource && (
                                    <p className="text-sm text-slate-500 mt-1"><strong>Ресурс:</strong> {task.resource}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </>
    );
}

/* ---- Tool 3: Формативное оценивание ---- */
function FormativeContent({ content }) {
    const exitTicket = content['exit_ticket'] || [];
    const quickPoll = content['quick_poll'] || [];
    const selfAssessment = content['self_assessment'] || [];
    const observation = content['observation_sheet'] || [];
    const kwl = content['kwl'];

    if (!exitTicket.length && !quickPoll.length && !selfAssessment.length && !observation.length && !kwl) return <EmptyContent />;

    return (
        <>
            {exitTicket.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Выходной билет (Exit Ticket)</h2>
                    <div className="space-y-3">
                        {exitTicket.map((item, i) => (
                            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                                <p className="font-medium text-slate-800">{i + 1}. {item.question}</p>
                                <p className="text-sm text-emerald-700 mt-1">Ожидаемый ответ: {item.expected_answer}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {quickPoll.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Быстрый опрос (Верно / Неверно)</h2>
                    <div className="space-y-3">
                        {quickPoll.map((item, i) => (
                            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex items-start gap-3">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded mt-0.5 ${item.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {item.correct ? 'Верно' : 'Неверно'}
                                </span>
                                <div>
                                    <p className="font-medium text-slate-800">{item.statement}</p>
                                    {item.explanation && <p className="text-sm text-slate-600 mt-1">{item.explanation}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {selfAssessment.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <h2 className="text-lg font-bold text-slate-800 p-6 pb-0">Лист самооценки</h2>
                    <div className="overflow-x-auto p-6">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="py-3 px-4 font-bold text-slate-600">Критерий</th>
                                    <th className="py-3 px-4 font-bold text-emerald-600">Могу</th>
                                    <th className="py-3 px-4 font-bold text-yellow-600">Частично</th>
                                    <th className="py-3 px-4 font-bold text-red-600">Нужна помощь</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selfAssessment.map((item, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-3 px-4 font-medium text-slate-800">{item.criteria}</td>
                                        <td className="py-3 px-4 text-slate-700">{item.descriptor_can}</td>
                                        <td className="py-3 px-4 text-slate-700">{item.descriptor_partial}</td>
                                        <td className="py-3 px-4 text-slate-700">{item.descriptor_need_help}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {observation.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Наблюдательный лист</h2>
                    <div className="space-y-3">
                        {observation.map((item, i) => (
                            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                                <p className="font-medium text-slate-800">{item.criteria}</p>
                                <p className="text-sm text-slate-600 mt-1">Показатели: {item.indicators}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {kwl && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <h2 className="text-lg font-bold text-slate-800 p-6 pb-0">KWL таблица</h2>
                    <div className="overflow-x-auto p-6">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="py-3 px-4 font-bold text-slate-600">Знаю (K)</th>
                                    <th className="py-3 px-4 font-bold text-slate-600">Хочу узнать (W)</th>
                                    <th className="py-3 px-4 font-bold text-slate-600">Узнал (L)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="py-3 px-4 text-slate-700 align-top">
                                        {(kwl.know_prompts || []).map((p, i) => <p key={i} className="mb-1">{p}</p>)}
                                    </td>
                                    <td className="py-3 px-4 text-slate-700 align-top">
                                        {(kwl.want_prompts || []).map((p, i) => <p key={i} className="mb-1">{p}</p>)}
                                    </td>
                                    <td className="py-3 px-4 text-slate-700 align-top">
                                        {(kwl.learned_prompts || []).map((p, i) => <p key={i} className="mb-1">{p}</p>)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </>
    );
}

/* ---- Tool 4: Структурные задания ---- */
function StructuralContent({ content }) {
    const levels = content['levels'] || [];
    if (!levels.length) return <EmptyContent />;

    const LEVEL_COLORS = {
        A: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
        B: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
        C: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
    };

    return (
        <>
            {levels.map((level, li) => {
                const colors = LEVEL_COLORS[level.level] || LEVEL_COLORS.A;
                return (
                    <section key={li} className={`border rounded-xl shadow-sm p-6 ${colors.bg} ${colors.border}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`text-sm font-bold px-3 py-1 rounded ${colors.badge}`}>
                                Уровень {level.level}
                            </span>
                            <h2 className="text-lg font-bold text-slate-800">{level.level_name}</h2>
                            {level.bloom_tags && (
                                <div className="flex gap-1">
                                    {level.bloom_tags.map((tag, ti) => (
                                        <span key={ti} className="text-xs bg-white/80 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            {(level.tasks || []).map((task, ti) => (
                                <div key={ti} className="bg-white border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-slate-800">Задание {task.task_number}</h3>
                                        <div className="flex gap-2 text-xs text-slate-500">
                                            <span>Макс: {task.max_score} б.</span>
                                            <span>{task.time_minutes} мин</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-700 mb-2">{task.task_text}</p>
                                    {task.instruction && <p className="text-sm text-slate-600 mb-2 italic">{task.instruction}</p>}
                                    {task.descriptors && task.descriptors.length > 0 && (
                                        <div className="mt-3 border-t border-slate-100 pt-3">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Дескрипторы:</p>
                                            <ul className="space-y-1">
                                                {task.descriptors.map((d, di) => (
                                                    <li key={di} className="text-sm text-slate-600 flex justify-between">
                                                        <span>{d.criterion}</span>
                                                        <span className="text-slate-500 shrink-0 ml-2">{d.max_score} б.</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
        </>
    );
}

/* ---- Tool 5: Презентация ---- */
function PresentationContent({ content }) {
    const slides = content['Презентация'] || [];
    if (!slides.length) return <EmptyContent />;

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Презентация</h2>
            <div className="space-y-4">
                {slides.map((slide, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-semibold text-slate-800">{slide['Слайд'] || `Слайд ${i + 1}`}: {slide['Заголовок']}</h3>
                        {slide['Контекст'] && <p className="text-slate-700 mt-1">{slide['Контекст']}</p>}
                        {(slide['image_url'] || slide['image_data_url']) && (
                            <img src={slide['image_url'] || slide['image_data_url']} alt={slide['Заголовок'] || `Слайд ${i + 1}`} className="mt-3 rounded-lg max-w-full max-h-80 object-contain bg-slate-100" />
                        )}
                        {slide['Иллюстрация'] && !slide['image_url'] && !slide['image_data_url'] && (
                            <p className="text-sm text-slate-600 mt-2 italic">Иллюстрация: {slide['Иллюстрация']}</p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ---- Tool 6: Обратная связь ---- */
function FeedbackContent({ content }) {
    const fb = content['Обратная_связь'] || content['Обратная связь'] || [];
    const questions = content['Вопросы_для_рефлексии'] || [];
    const recs = content['Рекомендации'] || [];

    if (!fb.length && !questions.length && !recs.length) return <EmptyContent />;

    return (
        <>
            {fb.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Обратная связь</h2>
                    <div className="space-y-4">
                        {fb.map((item, i) => (
                            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 mb-1">{item['Принцип'] || item.Принцип}</h3>
                                <p className="text-slate-700">{item['Комментарий'] || item.Комментарий}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {questions.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-3">Вопросы для рефлексии</h2>
                    <ul className="space-y-2">
                        {questions.map((q, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-orange-500 font-bold shrink-0">{i + 1}.</span>
                                <span className="text-slate-700">{q}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {recs.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-3">Рекомендации</h2>
                    <ul className="space-y-2">
                        {recs.map((r, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-500 shrink-0">&#10003;</span>
                                <span className="text-slate-700">{r}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}

/* ---- Tool 7: Органайзер ---- */
function OrganizerContent({ content }) {
    const orgType = content.type || '';
    const typeName = ORGANIZER_NAMES[orgType] || 'Органайзер';
    const html = content.html || '';

    if (!html) {
        return (
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <p className="text-slate-500">HTML-органайзер не найден в данных.</p>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-slate-800">{content.title || typeName}</h2>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">{typeName}</span>
                </div>
                {content.topic && <p className="text-sm text-slate-500">Тема: {content.topic}</p>}
                <p className="text-xs text-slate-400 mt-1">
                    Нажмите на любой текст для редактирования. Используйте кнопку «Скачать как Word» внутри документа.
                </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <iframe
                    srcDoc={html}
                    title={content.title || typeName}
                    className="w-full"
                    style={{ height: '90vh', border: 'none' }}
                    sandbox="allow-scripts allow-same-origin allow-downloads"
                />
            </div>
        </section>
    );
}


// Game renderers
// ---------------------------------------------------------------------------

function GameContent({ content }) {
    const gameType = content.type || '';
    const gameName = GAME_NAMES[gameType] || 'Игра';
    const html = content.html || '';

    if (!html) {
        return (
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <p className="text-slate-500">HTML-игра не найдена в данных.</p>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-slate-800">{content.title || gameName}</h2>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">{gameName}</span>
                </div>
                {content.topic && <p className="text-sm text-slate-500">Тема: {content.topic}</p>}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <iframe
                    srcDoc={html}
                    title={content.title || gameName}
                    className="w-full"
                    style={{ height: '85vh', border: 'none' }}
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>
        </section>
    );
}


function EmptyContent() {
    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <p className="text-slate-500">Содержимое пусто или в другом формате.</p>
        </section>
    );
}
