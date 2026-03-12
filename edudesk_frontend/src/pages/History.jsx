import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, deleteLesson } from '../services/api';
import { TOOLS } from '../context/LessonParamsContext';

const TOOL_TYPE_LABELS = Object.fromEntries(TOOLS.map(t => [t.id, t.name]));

const TOOL_BADGE_CLASSES = {
    lesson_plan:  'bg-orange-100 text-orange-700 border-orange-200',
    sor_soch:     'bg-blue-50 text-blue-700 border-blue-200',
    formative:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    structural:   'bg-purple-50 text-purple-700 border-purple-200',
    presentation: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    feedback:     'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function History() {
    const navigate = useNavigate();
    const [historyList, setHistoryList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterToolType, setFilterToolType] = useState('');

    const loadHistory = async () => {
        try {
            setIsLoading(true);
            const data = await getHistory();
            setHistoryList(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadHistory(); }, []);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Удалить эту генерацию?')) {
            try {
                await deleteLesson(id);
                loadHistory();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const uniqueGrades = useMemo(() => [...new Set(historyList.map(i => i.grade).filter(Boolean))], [historyList]);
    const uniqueSubjects = useMemo(() => [...new Set(historyList.map(i => i.subject).filter(Boolean))], [historyList]);

    const filteredList = useMemo(() => {
        return historyList.filter(item => {
            if (filterGrade && item.grade !== filterGrade) return false;
            if (filterSubject && item.subject !== filterSubject) return false;
            if (filterToolType && item.tool_type !== filterToolType) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                if (!item.title.toLowerCase().includes(q) && !(item.subject || '').toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [historyList, filterGrade, filterSubject, filterToolType, searchQuery]);

    return (
        <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col bg-slate-50 grid-pattern relative h-[calc(100vh-64px)]">
            <div className="max-w-6xl mx-auto flex-1 flex flex-col h-full w-full">
                <div className="flex flex-col space-y-6 mb-8 mt-2">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">История генераций</h1>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative min-w-[160px]">
                            <select className="w-full border-slate-200 rounded-xl text-base py-2.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white shadow-sm font-medium" value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                                <option value="">Все классы</option>
                                {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="relative min-w-[160px]">
                            <select className="w-full border-slate-200 rounded-xl text-base py-2.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white shadow-sm font-medium" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                                <option value="">Все предметы</option>
                                {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="relative min-w-[180px]">
                            <select className="w-full border-slate-200 rounded-xl text-base py-2.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white shadow-sm font-medium" value={filterToolType} onChange={(e) => setFilterToolType(e.target.value)}>
                                <option value="">Все инструменты</option>
                                {TOOLS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="relative flex-1 min-w-[280px]">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input
                                type="text"
                                className="block w-full border-slate-200 rounded-xl text-base py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder-slate-400 bg-white shadow-sm font-medium"
                                placeholder="Поиск по названию..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col mb-8" style={{ minHeight: 'calc(100vh - 340px)' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-full">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider w-1/3">Название</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Тип</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Предмет</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Класс</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Дата</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {isLoading ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Загрузка...</td></tr>
                                ) : filteredList.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">{historyList.length > 0 ? 'Нет результатов по фильтру' : 'История пуста'}</td></tr>
                                ) : (
                                    filteredList.map((item) => {
                                        const badgeCls = TOOL_BADGE_CLASSES[item.tool_type] || TOOL_BADGE_CLASSES.lesson_plan;
                                        return (
                                            <tr key={item.id} onClick={() => navigate(`/lesson/${item.id}`)} className="hover:bg-orange-50/30 transition-colors group cursor-pointer">
                                                <td className="px-6 py-4">
                                                    <span className="text-base font-bold text-slate-800 group-hover:text-orange-600 transition-colors">{item.title}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${badgeCls}`}>
                                                        {TOOL_TYPE_LABELS[item.tool_type] || item.tool_type || 'План урока'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                        <span>{item.subject}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                        {item.grade}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-base text-slate-500 font-medium">{new Date(item.created_at).toLocaleDateString('ru-RU')}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={(e) => handleDelete(item.id, e)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Удалить">
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
