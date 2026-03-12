import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useLessonParams, TOOLS } from '../context/LessonParamsContext';
import { getHistory, deleteLesson, downloadLessonExport } from '../services/api';

const TOOL_TYPE_LABELS = Object.fromEntries(TOOLS.map(t => [t.id, t.name]));
const TOOL_TYPE_COLORS = Object.fromEntries(TOOLS.map(t => [t.id, t.color]));

const BADGE_CLASSES = {
    orange:  'bg-orange-100 text-orange-700 border-orange-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    green:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple:  'bg-purple-50 text-purple-700 border-purple-200',
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function NewLesson() {
    const { params, setParam, showParamsModal, openParamsModal, closeParamsModal } = useLessonParams();
    const [generations, setGenerations] = useState([]);
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const navigate = useNavigate();

    const loadHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const data = await getHistory();
            setHistoryList(data);
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const onGenerated = useCallback((result) => {
        setGenerations((prev) => [result, ...prev]);
    }, []);

    const displayedItems = useMemo(() => {
        const fromSession = generations;
        const fromHistory = historyList.filter((h) => !fromSession.some((g) => g.id === h.id));
        return [...fromSession, ...fromHistory];
    }, [generations, historyList]);

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить эту генерацию?')) return;
        try {
            await deleteLesson(id);
            setGenerations((prev) => prev.filter((g) => g.id !== id));
            loadHistory();
        } catch (err) {
            console.error(err);
        }
    };

    const handleExport = async (item) => {
        try {
            const name = (item.title || 'result').replace(/[^\w\s-]/g, '').slice(0, 40);
            await downloadLessonExport(item.id, `${item.tool_type}_${name}.docx`);
        } catch (err) {
            console.error(err);
            alert(err.message || 'Не удалось скачать Word.');
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden relative h-[calc(100vh-64px)]">
            <Sidebar onGenerated={onGenerated} />

            <main className="flex-1 bg-slate-50 relative overflow-y-auto grid-pattern p-6 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 mb-1">Урок</h1>
                            <p className="text-base text-slate-500">Выберите инструмент, введите тему и нажмите «Создать».</p>
                        </div>
                        <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-orange-500 transition-all shadow-sm" onClick={openParamsModal} title="Основные параметры">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    </div>

                    {/* История и результаты генерации */}
                    {historyLoading && historyList.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
                            <p className="text-slate-500 font-medium">Загрузка истории...</p>
                        </div>
                    ) : displayedItems.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-600 uppercase tracking-wider">История генераций</h2>
                                <Link to="/history" className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline">Вся история</Link>
                            </div>
                            {displayedItems.map((item) => {
                                const color = TOOL_TYPE_COLORS[item.tool_type] || 'orange';
                                const badgeCls = BADGE_CLASSES[color] || BADGE_CLASSES.orange;
                                return (
                                    <div key={item.id} className="group bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex items-center justify-between hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="size-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold text-slate-800 truncate">{item.title}</h3>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${badgeCls}`}>
                                                            {TOOL_TYPE_LABELS[item.tool_type] || item.tool_type}
                                                        </span>
                                                        {item.created_at && (
                                                            <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString('ru-RU')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-4">
                                            <button onClick={() => navigate(`/lesson/${item.id}`)} className="size-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center" title="Просмотр">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            <button onClick={() => handleExport(item)} className="size-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center" title="Скачать Word">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="size-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center" title="Удалить">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
                            <div className="size-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </div>
                            <p className="text-base text-slate-500 mb-2">Результаты генерации появятся здесь</p>
                            <p className="text-sm text-slate-400">Выберите инструмент слева, введите тему и нажмите «Создать».</p>
                        </div>
                    )}
                </div>

                {/* Settings Modal */}
                {showParamsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800">Основные параметры урока</h2>
                                <button onClick={closeParamsModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-200">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </header>

                            <main className="p-6 overflow-y-auto space-y-8 flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-base font-bold text-slate-700 mb-1.5">Класс<span className="text-red-500 ml-0.5">*</span></label>
                                        <select className="w-full rounded-lg border-slate-300 text-base focus:ring-orange-500 focus:border-orange-500 shadow-sm" value={params.grade} onChange={(e) => setParam('grade', e.target.value)}>
                                            <option value="">--</option>
                                            {['1','2','3','4','5','6','7','8','9','10','11'].map(n => <option key={n} value={`${n} класс`}>{n} класс</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-base font-bold text-slate-700 mb-1.5">Предмет<span className="text-red-500 ml-0.5">*</span></label>
                                        <select className="w-full rounded-lg border-slate-300 text-base focus:ring-orange-500 focus:border-orange-500 shadow-sm" value={params.subject} onChange={(e) => setParam('subject', e.target.value)}>
                                            <option value="">--</option>
                                            {['Математика','Алгебра','Геометрия','Физика','Химия','Биология','История','География','Русский язык','Казахский язык','Английский язык','Информатика','Литература','Музыка','Технология','Физическая культура'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-base font-bold text-slate-700 mb-1.5">Язык обучения<span className="text-red-500 ml-0.5">*</span></label>
                                        <select className="w-full rounded-lg border-slate-300 text-base focus:ring-orange-500 focus:border-orange-500 shadow-sm" value={params.language} onChange={(e) => setParam('language', e.target.value)}>
                                            <option value="">--</option>
                                            <option value="Русский">Русский</option>
                                            <option value="Казахский">Казахский</option>
                                            <option value="Английский">Английский</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-base font-bold text-slate-700 mb-1.5">Четверть</label>
                                            <select className="w-full rounded-lg border-slate-300 text-base focus:ring-orange-500 focus:border-orange-500 shadow-sm" value={params.section} onChange={(e) => setParam('section', e.target.value)}>
                                                <option value="">--</option>
                                                {[1,2,3,4].map(n => <option key={n} value={`${n} четверть`}>{n} четверть</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-base font-bold text-slate-700 mb-1.5">Раздел</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 text-base focus:ring-orange-500 focus:border-orange-500 shadow-sm" placeholder="Напр. Натуральные числа" value={params.division} onChange={(e) => setParam('division', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-base font-bold text-slate-700 mb-1.5">Тема урока</label>
                                            <input type="text" className="w-full rounded-lg border-slate-300 text-base focus:ring-orange-500 focus:border-orange-500 shadow-sm" placeholder="Напр. Сложение и вычитание" value={params.topic} onChange={(e) => setParam('topic', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-base font-bold text-slate-700 mb-1.5">Цель обучения</label>
                                    <textarea className="w-full rounded-lg border-slate-300 text-base focus:ring-orange-500 focus:border-orange-500 shadow-sm" rows={2} placeholder="Напр. Понимать и применять на практике" value={params.learning_obj} onChange={(e) => setParam('learning_obj', e.target.value)} />
                                </div>

                                <div>
                                    <label className="block text-base font-bold text-slate-700 mb-1.5">Учебные ресурсы</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300 text-base focus:ring-orange-500 focus:border-orange-500 shadow-sm" placeholder="Ссылки или описание" value={params.resources} onChange={(e) => setParam('resources', e.target.value)} />
                                </div>

                                <div>
                                    <label className="block text-base font-bold text-slate-700 mb-1.5">Дополнительные условия</label>
                                    <textarea className="w-full rounded-lg border-slate-300 text-base focus:ring-orange-500 focus:border-orange-500 shadow-sm" rows={2} placeholder="Особые требования к уроку" value={params.extra_conditions} onChange={(e) => setParam('extra_conditions', e.target.value)} />
                                </div>
                            </main>

                            <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                                <button onClick={closeParamsModal} className="px-5 py-2.5 text-base font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
                                    Отмена
                                </button>
                                <button onClick={closeParamsModal} className="px-5 py-2.5 text-base font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 shadow-md shadow-orange-600/20 transition-all active:scale-95">
                                    Применить
                                </button>
                            </footer>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
