import React, { useState, useRef, useMemo } from 'react';
import {
    generateLesson,
    generateAssessment,
    generateFormative,
    generateStructural,
    generatePresentation,
    generateFeedback,
    generateOrganizer,
    generateGame,
} from '../services/api';
import { useLessonParams, TOOLS, ORGANIZERS, GAMES } from '../context/LessonParamsContext';

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;
const TEXT_TYPES = ['text/plain', 'text/html', 'application/json', 'text/csv', 'text/markdown'];

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error('Не удалось прочитать файл'));
        r.readAsText(file, 'UTF-8');
    });
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            const dataUrl = r.result;
            const base64 = dataUrl.split(',')[1];
            resolve(base64 || '');
        };
        r.onerror = () => reject(new Error('Не удалось прочитать файл'));
        r.readAsDataURL(file);
    });
}

const TOOL_ICONS = {
    lesson_plan: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    ),
    sor_soch: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    ),
    formative: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    structural: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    ),
    presentation: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21l4-4m0 0l4 4m-4-4V3m0 0L3 7m8-4l8 4M3 12h18" /></svg>
    ),
    feedback: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
    ),
};

const COLOR_MAP = {
    orange:  { bg: 'bg-orange-100',  text: 'text-orange-600',  border: 'border-orange-200',  activeBorder: 'border-orange-500',  shadow: 'shadow-[0_0_0_1px_rgba(236,91,19,0.15)]' },
    blue:    { bg: 'bg-blue-50',     text: 'text-blue-600',    border: 'border-blue-200',    activeBorder: 'border-blue-500',    shadow: 'shadow-[0_0_0_1px_rgba(59,130,246,0.15)]' },
    green:   { bg: 'bg-emerald-50',  text: 'text-emerald-600', border: 'border-emerald-200', activeBorder: 'border-emerald-500', shadow: 'shadow-[0_0_0_1px_rgba(16,185,129,0.15)]' },
    purple:  { bg: 'bg-purple-50',   text: 'text-purple-600',  border: 'border-purple-200',  activeBorder: 'border-purple-500',  shadow: 'shadow-[0_0_0_1px_rgba(147,51,234,0.15)]' },
    indigo:  { bg: 'bg-indigo-50',   text: 'text-indigo-600',  border: 'border-indigo-200',  activeBorder: 'border-indigo-500',  shadow: 'shadow-[0_0_0_1px_rgba(99,102,241,0.15)]' },
    emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-600', border: 'border-emerald-200', activeBorder: 'border-emerald-500', shadow: 'shadow-[0_0_0_1px_rgba(16,185,129,0.15)]' },
    teal:    { bg: 'bg-teal-50',     text: 'text-teal-600',    border: 'border-teal-200',    activeBorder: 'border-teal-500',    shadow: 'shadow-[0_0_0_1px_rgba(20,184,166,0.15)]' },
    amber:   { bg: 'bg-amber-50',    text: 'text-amber-600',   border: 'border-amber-200',   activeBorder: 'border-amber-500',   shadow: 'shadow-[0_0_0_1px_rgba(245,158,11,0.15)]' },
    red:     { bg: 'bg-red-50',      text: 'text-red-600',     border: 'border-red-200',     activeBorder: 'border-red-500',     shadow: 'shadow-[0_0_0_1px_rgba(239,68,68,0.15)]' },
};

const GENERATE_FN_MAP = {
    lesson_plan:  generateLesson,
    sor_soch:     generateAssessment,
    formative:    generateFormative,
    structural:   generateStructural,
    presentation: generatePresentation,
    feedback:     generateFeedback,
};

// ---------------------------------------------------------------------------
// SVG Thumbnails for each organizer type
// ---------------------------------------------------------------------------
const ORG_THUMBNAILS = {
    kwl: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#EEF6FF"/>
            <rect x="6" y="6" width="46" height="98" rx="4" fill="white" stroke="#BFDBFE" strokeWidth="1"/>
            <rect x="57" y="6" width="46" height="98" rx="4" fill="white" stroke="#BFDBFE" strokeWidth="1"/>
            <rect x="108" y="6" width="46" height="98" rx="4" fill="white" stroke="#BFDBFE" strokeWidth="1"/>
            <rect x="6" y="6" width="46" height="16" rx="4" fill="#BFDBFE"/>
            <rect x="57" y="6" width="46" height="16" rx="4" fill="#FDE68A"/>
            <rect x="108" y="6" width="46" height="16" rx="4" fill="#A7F3D0"/>
            <text x="29" y="18" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1D4ED8">Знаю</text>
            <text x="80" y="18" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#92400E">Хочу</text>
            <text x="131" y="18" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#065F46">Узнал</text>
            {[30,40,50,60,70,80,90].map(y => (
                <g key={y}>
                    <rect x="10" y={y} width="38" height="4" rx="2" fill="#DBEAFE"/>
                    <rect x="61" y={y} width="38" height="4" rx="2" fill="#FEF3C7"/>
                    <rect x="112" y={y} width="38" height="4" rx="2" fill="#D1FAE5"/>
                </g>
            ))}
        </svg>
    ),
    t_chart: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#F5F3FF"/>
            <rect x="6" y="6" width="148" height="16" rx="4" fill="#DDD6FE"/>
            <text x="80" y="18" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#5B21B6">Сравнение</text>
            <rect x="6" y="26" width="71" height="78" rx="4" fill="white" stroke="#C4B5FD" strokeWidth="1"/>
            <rect x="83" y="26" width="71" height="78" rx="4" fill="white" stroke="#C4B5FD" strokeWidth="1"/>
            <text x="41" y="36" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#7C3AED">Левая</text>
            <text x="118" y="36" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#7C3AED">Правая</text>
            {[42,52,62,72,82,92].map(y => (
                <g key={y}>
                    <rect x="10" y={y} width="63" height="4" rx="2" fill="#EDE9FE"/>
                    <rect x="87" y={y} width="63" height="4" rx="2" fill="#EDE9FE"/>
                </g>
            ))}
        </svg>
    ),
    venn: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#EFF6FF"/>
            <ellipse cx="58" cy="58" rx="44" ry="44" fill="#BFDBFE" fillOpacity="0.7" stroke="#3B82F6" strokeWidth="1.5"/>
            <ellipse cx="102" cy="58" rx="44" ry="44" fill="#FCA5A5" fillOpacity="0.7" stroke="#EF4444" strokeWidth="1.5"/>
            <text x="38" y="56" textAnchor="middle" fontSize="6" fill="#1E40AF" fontWeight="bold">Только</text>
            <text x="38" y="64" textAnchor="middle" fontSize="6" fill="#1E40AF" fontWeight="bold">А</text>
            <text x="80" y="56" textAnchor="middle" fontSize="6" fill="#4B5563" fontWeight="bold">Общее</text>
            <text x="122" y="56" textAnchor="middle" fontSize="6" fill="#991B1B" fontWeight="bold">Только</text>
            <text x="122" y="64" textAnchor="middle" fontSize="6" fill="#991B1B" fontWeight="bold">Б</text>
            {[76,84,92].map((y,i) => <rect key={i} x="60" y={y} width="20" height="3" rx="1.5" fill="#A7F3D0" />)}
            {[72,80,88,96].map((y,i) => <rect key={i} x="18" y={y} width="28" height="3" rx="1.5" fill="#DBEAFE" />)}
            {[72,80,88,96].map((y,i) => <rect key={i} x="96" y={y} width="28" height="3" rx="1.5" fill="#FEE2E2" />)}
        </svg>
    ),
    frayer: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#ECFDF5"/>
            <rect x="6" y="6" width="71" height="45" rx="4" fill="#A7F3D0" stroke="#6EE7B7" strokeWidth="1"/>
            <rect x="83" y="6" width="71" height="45" rx="4" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="1"/>
            <rect x="6" y="57" width="71" height="47" rx="4" fill="#DBEAFE" stroke="#BFDBFE" strokeWidth="1"/>
            <rect x="83" y="57" width="71" height="47" rx="4" fill="#FCE7F3" stroke="#FBCFE8" strokeWidth="1"/>
            <rect x="46" y="44" width="68" height="20" rx="4" fill="white" stroke="#6EE7B7" strokeWidth="1.5"/>
            <text x="80" y="57" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#065F46">Термин</text>
            <text x="41" y="18" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#065F46">Определение</text>
            <text x="118" y="18" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#92400E">Признаки</text>
            <text x="41" y="69" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#1E40AF">Примеры</text>
            <text x="118" y="69" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#9D174D">Не-примеры</text>
            {[24,32].map(y => <rect key={y} x="10" y={y} width="62" height="3" rx="1.5" fill="#6EE7B7"/>)}
            {[24,32].map(y => <rect key={y} x="87" y={y} width="62" height="3" rx="1.5" fill="#FDE68A"/>)}
            {[75,83,91].map(y => <rect key={y} x="10" y={y} width="62" height="3" rx="1.5" fill="#BFDBFE"/>)}
            {[75,83,91].map(y => <rect key={y} x="87" y={y} width="62" height="3" rx="1.5" fill="#FBCFE8"/>)}
        </svg>
    ),
    concept_map: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#F0FDF4"/>
            <rect x="52" y="42" width="56" height="22" rx="8" fill="#6EE7B7" stroke="#10B981" strokeWidth="1.5"/>
            <text x="80" y="56" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#065F46">Понятие</text>
            <line x1="52" y1="53" x2="26" y2="22" stroke="#10B981" strokeWidth="1.5"/>
            <line x1="108" y1="53" x2="134" y2="22" stroke="#10B981" strokeWidth="1.5"/>
            <line x1="80" y1="64" x2="40" y2="90" stroke="#10B981" strokeWidth="1.5"/>
            <line x1="80" y1="64" x2="120" y2="90" stroke="#10B981" strokeWidth="1.5"/>
            {[[6,10,40,22],[94,10,54,22],[10,82,60,28],[90,82,60,22]].map(([x,y,w,h],i) => (
                <rect key={i} x={x} y={y} width={w} height={h} rx="5" fill="white" stroke="#A7F3D0" strokeWidth="1"/>
            ))}
            {[16,22,28].map(y => <rect key={y} x="10" y={y} width="30" height="3" rx="1.5" fill="#D1FAE5"/>)}
            {[16,22,28].map(y => <rect key={y} x="98" y={y} width="46" height="3" rx="1.5" fill="#D1FAE5"/>)}
            {[88,94].map(y => <rect key={y} x="14" y={y} width="50" height="3" rx="1.5" fill="#D1FAE5"/>)}
            {[88,94].map(y => <rect key={y} x="94" y={y} width="50" height="3" rx="1.5" fill="#D1FAE5"/>)}
        </svg>
    ),
    mind_map: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#FFFBEB"/>
            <ellipse cx="80" cy="55" rx="24" ry="16" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.5"/>
            <text x="80" y="58" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#78350F">Идея</text>
            {[
                [80,55,14,14,'#FEF3C7','#F59E0B',[8,13]],
                [80,55,146,14,'#FEF3C7','#F59E0B',[132,13]],
                [80,55,14,96,'#FEF3C7','#F59E0B',[8,91]],
                [80,55,146,96,'#FEF3C7','#F59E0B',[132,91]],
                [80,55,80,10,'#FEF3C7','#F59E0B',[62,6]],
                [80,55,80,100,'#FEF3C7','#F59E0B',[62,96]],
            ].map(([x1,y1,x2,y2,fill,stroke,rPos],i) => (
                <g key={i}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="1.2"/>
                    <rect x={rPos[0]} y={rPos[1]} width="30" height="12" rx="4" fill={fill} stroke={stroke} strokeWidth="1"/>
                </g>
            ))}
        </svg>
    ),
    sequence: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#FFF7ED"/>
            {[8,30,52,74,96].map((y, i) => (
                <g key={i}>
                    <circle cx="18" cy={y+7} r="7" fill="#FB923C" />
                    <text x="18" y={y+10} textAnchor="middle" fontSize="7" fontWeight="bold" fill="white">{i+1}</text>
                    <rect x="30" y={y} width="124" height="14" rx="4" fill="white" stroke="#FED7AA" strokeWidth="1"/>
                    <rect x="34" y={y+4} width="70" height="4" rx="2" fill="#FED7AA"/>
                    {i < 4 && <line x1="18" y1={y+14} x2="18" y2={y+22} stroke="#FB923C" strokeWidth="1.5" strokeDasharray="2"/>}
                </g>
            ))}
        </svg>
    ),
    timeline: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#FFF1F2"/>
            <line x1="20" y1="55" x2="150" y2="55" stroke="#F87171" strokeWidth="2"/>
            <polygon points="148,51 156,55 148,59" fill="#F87171"/>
            {[20,50,80,110,140].map((x, i) => (
                <g key={i}>
                    <circle cx={x} cy="55" r="5" fill="#EF4444" stroke="white" strokeWidth="1.5"/>
                    {i % 2 === 0 ? (
                        <>
                            <rect x={x-18} y="22" width="36" height="26" rx="4" fill="white" stroke="#FECACA" strokeWidth="1"/>
                            <line x1={x} y1="48" x2={x} y2="50" stroke="#EF4444" strokeWidth="1"/>
                            <rect x={x-14} y="26" width="28" height="3" rx="1.5" fill="#FCA5A5"/>
                            <rect x={x-14} y="32" width="22" height="3" rx="1.5" fill="#FEE2E2"/>
                            <rect x={x-14} y="38" width="25" height="3" rx="1.5" fill="#FEE2E2"/>
                        </>
                    ) : (
                        <>
                            <rect x={x-18} y="60" width="36" height="26" rx="4" fill="white" stroke="#FECACA" strokeWidth="1"/>
                            <line x1={x} y1="60" x2={x} y2="62" stroke="#EF4444" strokeWidth="1"/>
                            <rect x={x-14} y="64" width="28" height="3" rx="1.5" fill="#FCA5A5"/>
                            <rect x={x-14} y="70" width="22" height="3" rx="1.5" fill="#FEE2E2"/>
                            <rect x={x-14} y="76" width="25" height="3" rx="1.5" fill="#FEE2E2"/>
                        </>
                    )}
                </g>
            ))}
        </svg>
    ),
    marking_text: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#ECFDF5"/>
            <rect x="6" y="6" width="148" height="98" rx="6" fill="white" stroke="#A7F3D0" strokeWidth="1"/>
            <text x="14" y="20" fontSize="7" fontWeight="bold" fill="#065F46">Текст для аннотирования</text>
            {[26,33,40,47,54,61,68,75,82].map((y,i) => (
                <rect key={y} x="14" y={y} width={[118,100,112,90,118,74,112,100,80][i]} height="4" rx="2" fill={i===1||i===4||i===7 ? '#6EE7B7' : '#D1FAE5'}/>
            ))}
            <rect x="6" y="90" width="148" height="14" rx="4" fill="#D1FAE5"/>
            <text x="14" y="100" fontSize="6" fill="#065F46">Вопрос: ...</text>
        </svg>
    ),
};

const FEATURED_IDS = new Set(['marking_text', 't_chart']);

function OrganizerCard({ org, isActive, onClick }) {
    const thumbnail = ORG_THUMBNAILS[org.id];
    const isFeatured = FEATURED_IDS.has(org.id);
    return (
        <button
            onClick={onClick}
            className={`group flex flex-col rounded-2xl overflow-hidden border bg-white transition-all cursor-pointer text-left ${
                isActive
                    ? 'border-orange-500 border-2 shadow-lg shadow-orange-500/15'
                    : 'border-[#E8D9C8] hover:border-orange-400 hover:shadow-md'
            }`}
            style={{boxShadow: isActive ? undefined : '0 1px 4px rgba(0,0,0,0.06)'}}
        >
            {/* Thumbnail */}
            <div className="relative w-full bg-[#FDF7F0] border-b border-[#E8D9C8]" style={{height: '110px', padding: '8px'}}>
                {thumbnail}
                {isFeatured && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500 text-white uppercase tracking-wide">
                        Топ
                    </span>
                )}
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white text-slate-300 hover:text-amber-400 transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </button>
            </div>
            {/* Info */}
            <div className="p-3 flex-1">
                <h4 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-orange-700 transition-colors leading-tight">
                    {org.name}
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug line-clamp-3">
                    {org.description}
                </p>
            </div>
        </button>
    );
}

function OrganizerForm({ org, orgTopic, setOrgTopic, orgObjective, setOrgObjective, orgGrade, setOrgGrade, orgLanguage, setOrgLanguage, params, isGenerating, onGenerate, onBack }) {
    const thumbnail = ORG_THUMBNAILS[org.id];
    return (
        <div className="space-y-4">
            {/* Back button + title */}
            <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors font-medium"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                Назад к органайзерам
            </button>

            {/* Card preview header */}
            <div className="rounded-2xl overflow-hidden border border-[#E8D9C8] bg-white shadow-sm">
                <div className="bg-[#FDF7F0] border-b border-[#E8D9C8]" style={{height: '120px', padding: '10px'}}>
                    {thumbnail}
                </div>
                <div className="px-4 py-3">
                    <h3 className="font-bold text-slate-800 text-base">{org.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{org.description}</p>
                </div>
            </div>

            {/* Generation form */}
            <div className="bg-white border border-[#E8D9C8] rounded-2xl p-4 space-y-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Настройки генерации</h4>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Тема / Основная идея <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none placeholder:text-slate-400 transition-all"
                        placeholder="Например: Фотосинтез у растений"
                        value={orgTopic}
                        onChange={(e) => setOrgTopic(e.target.value)}
                        disabled={isGenerating}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Цель обучения
                        <span className="text-slate-400 font-normal ml-1">(необязательно)</span>
                    </label>
                    <input
                        type="text"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 placeholder:text-slate-400 transition-all"
                        placeholder="Например: Ученики смогут объяснить роль хлорофилла"
                        value={orgObjective}
                        onChange={(e) => setOrgObjective(e.target.value)}
                        disabled={isGenerating}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Класс</label>
                        <select
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white transition-all"
                            value={orgGrade || params.grade || ''}
                            onChange={(e) => setOrgGrade(e.target.value)}
                            disabled={isGenerating}
                        >
                            <option value="">Не указан</option>
                            {GRADE_OPTIONS.map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Язык</label>
                        <select
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white transition-all"
                            value={orgLanguage}
                            onChange={(e) => setOrgLanguage(e.target.value)}
                            disabled={isGenerating}
                        >
                            <option value="Русский">Русский</option>
                            <option value="Казахский">Казахский</option>
                            <option value="Английский">Английский</option>
                        </select>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={isGenerating || !orgTopic.trim()}
                    className={`w-full py-3 rounded-xl text-white text-base font-bold shadow-lg transition-all active:scale-95 ${
                        isGenerating || !orgTopic.trim()
                            ? 'bg-orange-300 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                    }`}
                >
                    {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            Генерация...
                        </span>
                    ) : `Создать ${org.name}`}
                </button>
            </div>
        </div>
    );
}

const GRADE_OPTIONS = [
    '1 класс','2 класс','3 класс','4 класс',
    '5 класс','6 класс','7 класс','8 класс',
    '9 класс','10 класс','11 класс',
];

// ---------------------------------------------------------------------------
// SVG Thumbnails for each game type
// ---------------------------------------------------------------------------
const GAME_THUMBNAILS = {
    bingo: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#FFF5F5"/>
            <rect x="6" y="6" width="148" height="14" rx="3" fill="#FCA5A5"/>
            <text x="80" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#991B1B">БИНГО</text>
            {[0,1,2,3,4].map(col => (
                <rect key={col} x={6 + col * 30} y="24" width="28" height="10" rx="2" fill="#FEE2E2"/>
            ))}
            {[0,1,2,3].map(row => [0,1,2,3,4].map(col => {
                const isFree = row === 1 && col === 2;
                return (
                    <rect key={`${row}-${col}`} x={6 + col * 30} y={36 + row * 18} width="28" height="16" rx="2"
                        fill={isFree ? '#EF4444' : '#FFF1F2'} stroke="#FECACA" strokeWidth="0.5"/>
                );
            }))}
            {[0,1,2,3,4].map(col => (
                <rect key={col} x={6 + col * 30} y="90" width="28" height="14" rx="2" fill="#FFF1F2" stroke="#FECACA" strokeWidth="0.5"/>
            ))}
        </svg>
    ),
    jeopardy: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#EFF6FF"/>
            <rect x="6" y="6" width="148" height="14" rx="3" fill="#2563EB"/>
            <text x="80" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">JEOPARDY</text>
            {[0,1,2,3,4].map(col => (
                <rect key={col} x={6 + col * 30} y="24" width="28" height="12" rx="2" fill="#1D4ED8"/>
            ))}
            {[0,1,2,3,4].map(row => [0,1,2,3,4].map(col => (
                <rect key={`${row}-${col}`} x={6 + col * 30} y={38 + row * 14} width="28" height="12" rx="2"
                    fill="#DBEAFE" stroke="#93C5FD" strokeWidth="0.5"/>
            )))}
        </svg>
    ),
    quiz_quiz_trade: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#F5F3FF"/>
            <rect x="10" y="8" width="65" height="90" rx="6" fill="white" stroke="#C4B5FD" strokeWidth="1.5"/>
            <rect x="85" y="8" width="65" height="90" rx="6" fill="white" stroke="#C4B5FD" strokeWidth="1.5"/>
            <rect x="10" y="8" width="65" height="28" rx="6" fill="#7C3AED"/>
            <rect x="85" y="8" width="65" height="28" rx="6" fill="#A78BFA"/>
            <text x="42" y="26" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white">Вопрос</text>
            <text x="117" y="26" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white">Ответ</text>
            {[42,54,66,78,88].map(y => (
                <g key={y}>
                    <rect x="14" y={y} width="57" height="4" rx="2" fill="#EDE9FE"/>
                    <rect x="89" y={y} width="57" height="4" rx="2" fill="#EDE9FE"/>
                </g>
            ))}
        </svg>
    ),
    four_corners: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#F0FDF4"/>
            <rect x="6" y="6" width="71" height="47" rx="6" fill="white" stroke="#86EFAC" strokeWidth="1.5"/>
            <rect x="83" y="6" width="71" height="47" rx="6" fill="white" stroke="#86EFAC" strokeWidth="1.5"/>
            <rect x="6" y="57" width="71" height="47" rx="6" fill="white" stroke="#86EFAC" strokeWidth="1.5"/>
            <rect x="83" y="57" width="71" height="47" rx="6" fill="white" stroke="#86EFAC" strokeWidth="1.5"/>
            <rect x="6" y="6" width="71" height="14" rx="6" fill="#16A34A"/>
            <rect x="83" y="6" width="71" height="14" rx="6" fill="#22C55E"/>
            <rect x="6" y="57" width="71" height="14" rx="6" fill="#4ADE80"/>
            <rect x="83" y="57" width="71" height="14" rx="6" fill="#86EFAC"/>
            <text x="41" y="17" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white">А</text>
            <text x="118" y="17" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white">Б</text>
            <text x="41" y="68" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#166534">В</text>
            <text x="118" y="68" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#166534">Г</text>
            {[24,32,40].map(y => (
                <g key={y}>
                    <rect x="10" y={y} width="63" height="3" rx="1.5" fill="#DCFCE7"/>
                    <rect x="87" y={y} width="63" height="3" rx="1.5" fill="#DCFCE7"/>
                    <rect x="10" y={y + 51} width="63" height="3" rx="1.5" fill="#DCFCE7"/>
                    <rect x="87" y={y + 51} width="63" height="3" rx="1.5" fill="#DCFCE7"/>
                </g>
            ))}
        </svg>
    ),
    battleship: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#EFF6FF"/>
            <rect x="6" y="6" width="148" height="98" rx="4" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1"/>
            {[0,1,2,3].map(row => [0,1,2,3].map(col => {
                const hit = (row === 0 && col === 1) || (row === 2 && col === 3);
                const miss = (row === 1 && col === 0) || (row === 3 && col === 2);
                return (
                    <rect key={`${row}-${col}`} x={10 + col * 36} y={10 + row * 24} width="34" height="22" rx="3"
                        fill={hit ? '#EF4444' : miss ? '#60A5FA' : 'white'} stroke="#BFDBFE" strokeWidth="1"/>
                );
            }))}
        </svg>
    ),
    escape_room: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#FFFBEB"/>
            <rect x="6" y="6" width="148" height="98" rx="8" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="1.5"/>
            <rect x="55" y="30" width="50" height="70" rx="4" fill="#D97706"/>
            <rect x="65" y="44" width="30" height="38" rx="3" fill="#92400E"/>
            <circle cx="80" cy="63" r="4" fill="#FCD34D"/>
            <rect x="78" y="63" width="4" height="12" rx="2" fill="#FCD34D"/>
            <text x="80" y="22" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#92400E">КВЕСТ</text>
            {[8,22].map((x, i) => (
                <g key={i}>
                    <rect x={x} y="20" width="40" height="8" rx="3" fill="#FDE68A"/>
                    <rect x={x} y="32" width="40" height="5" rx="2" fill="#FDE68A"/>
                    <rect x={x} y="40" width="40" height="5" rx="2" fill="#FDE68A"/>
                </g>
            ))}
        </svg>
    ),
    quest_outline: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#F0FDFA"/>
            {[0,1,2,3,4].map(i => (
                <g key={i}>
                    <circle cx={14 + i * 33} cy="55" r="10" fill={i < 3 ? '#0D9488' : '#CCFBF1'} stroke="#5EEAD4" strokeWidth="1.5"/>
                    <text x={14 + i * 33} y="59" textAnchor="middle" fontSize="9" fontWeight="bold" fill={i < 3 ? 'white' : '#0D9488'}>{i + 1}</text>
                    {i < 4 && <line x1={24 + i * 33} y1="55" x2={38 + i * 33} y2="55" stroke="#5EEAD4" strokeWidth="2"/>}
                </g>
            ))}
            <rect x="6" y="6" width="148" height="14" rx="3" fill="#0D9488"/>
            <text x="80" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">КВЕСТ-ПРИКЛЮЧЕНИЕ</text>
            {[0,1,2,3,4].map(i => (
                <rect key={i} x={6 + i * 33} y="72" width="26" height="30" rx="3" fill="white" stroke="#5EEAD4" strokeWidth="1"/>
            ))}
        </svg>
    ),
    stand_sit: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#FFF7ED"/>
            <rect x="6" y="6" width="148" height="14" rx="3" fill="#EA580C"/>
            <text x="80" y="17" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white">ВСТАНЬ / СЯДЬ</text>
            {[0,1,2,3,4].map(i => (
                <g key={i}>
                    <rect x="6" y={24 + i * 17} width="140" height="13" rx="3"
                        fill={i % 2 === 0 ? '#FED7AA' : '#FFEDD5'} stroke="#FDBA74" strokeWidth="0.5"/>
                    <rect x="140" y={26 + i * 17} width="6" height="9" rx="2"
                        fill={i % 3 === 0 ? '#16A34A' : '#EF4444'}/>
                    <rect x="10" y={27 + i * 17} width="80" height="3" rx="1.5" fill="#FB923C"/>
                    <rect x="10" y={33 + i * 17} width="60" height="3" rx="1.5" fill="#FB923C" opacity="0.6"/>
                </g>
            ))}
            <rect x="6" y="109" width="140" height="0" rx="0"/>
        </svg>
    ),
    this_or_that: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#F0FDF4"/>
            <rect x="6" y="6" width="148" height="14" rx="3" fill="#16A34A"/>
            <text x="80" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">ЭТО ИЛИ ТО?</text>
            {[0,1,2,3].map(i => (
                <g key={i}>
                    <rect x="6" y={24 + i * 21} width="70" height="17" rx="4" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1"/>
                    <rect x="84" y={24 + i * 21} width="70" height="17" rx="4" fill="#FEE2E2" stroke="#FCA5A5" strokeWidth="1"/>
                    <text x="80" y={35 + i * 21} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#374151">VS</text>
                    <rect x="10" y={28 + i * 21} width="50" height="4" rx="2" fill="#86EFAC"/>
                    <rect x="88" y={28 + i * 21} width="50" height="4" rx="2" fill="#FCA5A5"/>
                    <rect x="10" y={34 + i * 21} width="35" height="4" rx="2" fill="#86EFAC" opacity="0.7"/>
                    <rect x="88" y={34 + i * 21} width="35" height="4" rx="2" fill="#FCA5A5" opacity="0.7"/>
                </g>
            ))}
        </svg>
    ),
    tic_tac_toe: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#FFF5F5"/>
            <line x1="60" y1="10" x2="60" y2="100" stroke="#9CA3AF" strokeWidth="3"/>
            <line x1="100" y1="10" x2="100" y2="100" stroke="#9CA3AF" strokeWidth="3"/>
            <line x1="10" y1="40" x2="150" y2="40" stroke="#9CA3AF" strokeWidth="3"/>
            <line x1="10" y1="70" x2="150" y2="70" stroke="#9CA3AF" strokeWidth="3"/>
            <text x="35" y="30" textAnchor="middle" fontSize="18" fill="#EF4444" fontWeight="bold">X</text>
            <text x="80" y="63" textAnchor="middle" fontSize="16" fill="#3B82F6" fontWeight="bold">O</text>
            <text x="125" y="93" textAnchor="middle" fontSize="18" fill="#EF4444" fontWeight="bold">X</text>
            <rect x="10" y="42" width="46" height="26" rx="2" fill="#FEF2F2"/>
            <rect x="64" y="12" width="32" height="25" rx="2" fill="#EFF6FF"/>
            <rect x="104" y="72" width="44" height="26" rx="2" fill="#FEF2F2"/>
        </svg>
    ),
    trashketball: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#FFF7ED"/>
            <rect x="65" y="6" width="30" height="4" rx="2" fill="#9CA3AF"/>
            <ellipse cx="80" cy="22" rx="22" ry="4" fill="none" stroke="#F97316" strokeWidth="2"/>
            <line x1="80" y1="10" x2="80" y2="80" stroke="#9CA3AF" strokeWidth="1.5"/>
            <circle cx="40" cy="85" r="12" fill="#F97316" stroke="#EA580C" strokeWidth="1.5"/>
            <line x1="33" y1="85" x2="47" y2="85" stroke="#EA580C" strokeWidth="1.5"/>
            <line x1="40" y1="78" x2="40" y2="92" stroke="#EA580C" strokeWidth="1.5"/>
            <rect x="95" y="68" width="58" height="12" rx="3" fill="#FED7AA"/>
            <rect x="95" y="83" width="58" height="12" rx="3" fill="#FED7AA"/>
            <rect x="95" y="98" width="58" height="8" rx="3" fill="#FED7AA"/>
            <text x="95" y="78" fontSize="6" fill="#9A3412" fontWeight="bold"> Лёгкий •1</text>
            <text x="95" y="93" fontSize="6" fill="#9A3412" fontWeight="bold"> Средний •2</text>
            <text x="95" y="104" fontSize="6" fill="#9A3412" fontWeight="bold"> Сложный •3</text>
        </svg>
    ),
    word_search: (
        <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="160" height="110" fill="#EFF6FF"/>
            <rect x="6" y="6" width="148" height="14" rx="3" fill="#2563EB"/>
            <text x="80" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">ПОИСК СЛОВ</text>
            {Array.from({length: 8}).map((_, row) =>
                Array.from({length: 9}).map((_, col) => {
                    const highlighted = (row === 2 && col >= 1 && col <= 5) || (row === 4 && col >= 3 && col <= 7) || (row === 6 && col >= 0 && col <= 4);
                    return (
                        <rect key={`${row}-${col}`} x={6 + col * 17} y={24 + row * 11} width="15" height="9" rx="1"
                            fill={highlighted ? '#BFDBFE' : 'white'} stroke="#DBEAFE" strokeWidth="0.5"/>
                    );
                })
            )}
        </svg>
    ),
};

const GAME_FEATURED_IDS = new Set(['bingo', 'jeopardy', 'quiz_quiz_trade']);

function GameCard({ game, isActive, onClick }) {
    const thumbnail = GAME_THUMBNAILS[game.id];
    const isFeatured = GAME_FEATURED_IDS.has(game.id);
    return (
        <button
            onClick={onClick}
            className={`group flex flex-col rounded-2xl overflow-hidden border bg-white transition-all cursor-pointer text-left ${
                isActive
                    ? 'border-orange-500 border-2 shadow-lg shadow-orange-500/15'
                    : 'border-[#E8D9C8] hover:border-orange-400 hover:shadow-md'
            }`}
            style={{boxShadow: isActive ? undefined : '0 1px 4px rgba(0,0,0,0.06)'}}
        >
            <div className="relative w-full bg-[#FDF7F0] border-b border-[#E8D9C8]" style={{height: '110px', padding: '8px'}}>
                {thumbnail}
                {isFeatured && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500 text-white uppercase tracking-wide">
                        Топ
                    </span>
                )}
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white text-slate-300 hover:text-amber-400 transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </button>
            </div>
            <div className="p-3 flex-1">
                <h4 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-orange-700 transition-colors leading-tight">
                    {game.name}
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug line-clamp-3">
                    {game.description}
                </p>
            </div>
        </button>
    );
}

function GameForm({ game, gameTopic, setGameTopic, gameObjective, setGameObjective, gameGrade, setGameGrade, gameLanguage, setGameLanguage, params, isGenerating, onGenerate, onBack }) {
    const thumbnail = GAME_THUMBNAILS[game.id];
    return (
        <div className="space-y-4">
            <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors font-medium"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                Назад к играм
            </button>

            <div className="rounded-2xl overflow-hidden border border-[#E8D9C8] bg-white shadow-sm">
                <div className="bg-[#FDF7F0] border-b border-[#E8D9C8]" style={{height: '120px', padding: '10px'}}>
                    {thumbnail}
                </div>
                <div className="px-4 py-3">
                    <h3 className="font-bold text-slate-800 text-base">{game.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{game.description}</p>
                </div>
            </div>

            <div className="bg-white border border-[#E8D9C8] rounded-2xl p-4 space-y-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Настройки генерации</h4>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Тема / Основная идея <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none placeholder:text-slate-400 transition-all"
                        placeholder="Например: Фотосинтез у растений"
                        value={gameTopic}
                        onChange={(e) => setGameTopic(e.target.value)}
                        disabled={isGenerating}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Цель обучения
                        <span className="text-slate-400 font-normal ml-1">(необязательно)</span>
                    </label>
                    <input
                        type="text"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 placeholder:text-slate-400 transition-all"
                        placeholder="Например: Ученики смогут объяснить роль хлорофилла"
                        value={gameObjective}
                        onChange={(e) => setGameObjective(e.target.value)}
                        disabled={isGenerating}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Класс</label>
                        <select
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white transition-all"
                            value={gameGrade || params.grade || ''}
                            onChange={(e) => setGameGrade(e.target.value)}
                            disabled={isGenerating}
                        >
                            <option value="">Не указан</option>
                            {GRADE_OPTIONS.map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Язык</label>
                        <select
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white transition-all"
                            value={gameLanguage}
                            onChange={(e) => setGameLanguage(e.target.value)}
                            disabled={isGenerating}
                        >
                            <option value="Русский">Русский</option>
                            <option value="Казахский">Казахский</option>
                            <option value="Английский">Английский</option>
                        </select>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={isGenerating || !gameTopic.trim()}
                    className={`w-full py-3 rounded-xl text-white text-base font-bold shadow-lg transition-all active:scale-95 ${
                        isGenerating || !gameTopic.trim()
                            ? 'bg-orange-300 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                    }`}
                >
                    {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            Генерация...
                        </span>
                    ) : `Создать ${game.name}`}
                </button>
            </div>
        </div>
    );
}

export default function Sidebar({ onGenerated }) {
    const {
        params, openParamsModal,
        assessmentParams, setAssessmentParam,
        selectedTool, setSelectedTool,
    } = useLessonParams();

    // Top-level tab: 'tools' | 'organizer'
    const [activeTab, setActiveTab] = useState('tools');

    // Tools tab state
    const [topicInput, setTopicInput] = useState('');
    const [files, setFiles] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef(null);

    // Organizer tab state
    const [selectedOrganizer, setSelectedOrganizer] = useState(null);
    const [orgTopic, setOrgTopic] = useState('');
    const [orgObjective, setOrgObjective] = useState('');
    const [orgGrade, setOrgGrade] = useState('');
    const [orgLanguage, setOrgLanguage] = useState('Русский');
    const [isOrgGenerating, setIsOrgGenerating] = useState(false);
    const [orgSearch, setOrgSearch] = useState('');

    // Games tab state
    const [selectedGame, setSelectedGame] = useState(null);
    const [gameTopic, setGameTopic] = useState('');
    const [gameObjective, setGameObjective] = useState('');
    const [gameGrade, setGameGrade] = useState('');
    const [gameLanguage, setGameLanguage] = useState('Русский');
    const [isGameGenerating, setIsGameGenerating] = useState(false);
    const [gameSearch, setGameSearch] = useState('');

    const filteredTools = useMemo(() => {
        if (!searchQuery.trim()) return TOOLS;
        const q = searchQuery.toLowerCase();
        return TOOLS.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }, [searchQuery]);

    const filteredOrganizers = useMemo(() => {
        if (!orgSearch.trim()) return ORGANIZERS;
        const q = orgSearch.toLowerCase();
        return ORGANIZERS.filter(o => o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q));
    }, [orgSearch]);

    const filteredGames = useMemo(() => {
        if (!gameSearch.trim()) return GAMES;
        const q = gameSearch.toLowerCase();
        return GAMES.filter(g => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
    }, [gameSearch]);

    // Tools tab handlers
    const onFileSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        e.target.value = '';
        const limit = MAX_FILES - files.length;
        if (selected.length > limit) {
            alert(`Можно добавить не более ${MAX_FILES} файлов.`);
            selected.splice(limit);
        }
        for (const f of selected) {
            if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                alert(`Файл "${f.name}" слишком большой (макс. ${MAX_FILE_SIZE_MB} МБ)`);
                continue;
            }
            setFiles((prev) => [...prev, f]);
        }
    };

    const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

    const handleGenerate = async () => {
        const topic = topicInput.trim() || params.topic || '';
        if (!topic) {
            alert('Введите тему урока в поле ниже или укажите в «Основные параметры»');
            return;
        }

        const payload = {
            ...params,
            topic,
            extra_conditions: topicInput.trim() || params.extra_conditions || '',
        };

        if (selectedTool === 'sor_soch') {
            Object.assign(payload, assessmentParams);
        }

        if (files.length > 0) {
            const file_contents = [];
            for (const file of files) {
                try {
                    const isText = (file.type && (TEXT_TYPES.includes(file.type) || file.type.startsWith('text/'))) || /\.(txt|md|json|html|csv)$/i.test(file.name);
                    if (isText) {
                        const text = await readFileAsText(file);
                        file_contents.push({ name: file.name, mime_type: file.type || 'text/plain', content_text: text });
                    } else {
                        const b64 = await readFileAsBase64(file);
                        file_contents.push({ name: file.name, mime_type: file.type || 'application/octet-stream', content_base64: b64 });
                    }
                } catch (err) {
                    console.error(err);
                    alert(`Ошибка чтения файла ${file.name}`);
                }
            }
            if (file_contents.length) payload.file_contents = file_contents;
        }

        const generateFn = GENERATE_FN_MAP[selectedTool] || generateLesson;
        try {
            setIsGenerating(true);
            const result = await generateFn(payload);
            if (onGenerated) onGenerated(result);
        } catch (error) {
            console.error('Generation failed', error);
            const msg = error.response?.data?.error || error.response?.data?.details || 'Ошибка при генерации';
            alert(msg);
        } finally {
            setIsGenerating(false);
        }
    };

    // Organizer tab handler
    const handleGenerateOrganizer = async () => {
        if (!selectedOrganizer) {
            alert('Выберите тип органайзера');
            return;
        }
        const topic = orgTopic.trim();
        if (!topic) {
            alert('Введите тему или основную идею');
            return;
        }
        const payload = {
            organizer_type: selectedOrganizer.id,
            topic,
            learning_objective: orgObjective.trim() || undefined,
            grade: params.grade || '',
            language: params.language || 'Русский',
            subject: params.subject || '',
        };
        if (files.length > 0) {
            const file_contents = [];
            for (const file of files) {
                try {
                    const isText = (file.type && (TEXT_TYPES.includes(file.type) || file.type.startsWith('text/'))) || /\.(txt|md|json|html|csv)$/i.test(file.name);
                    if (isText) {
                        const text = await readFileAsText(file);
                        file_contents.push({ name: file.name, mime_type: file.type || 'text/plain', content_text: text });
                    } else {
                        const b64 = await readFileAsBase64(file);
                        file_contents.push({ name: file.name, mime_type: file.type || 'application/octet-stream', content_base64: b64 });
                    }
                } catch (err) {
                    console.error(err);
                    alert(`Ошибка чтения файла ${file.name}`);
                }
            }
            if (file_contents.length) payload.file_contents = file_contents;
        }
        try {
            setIsOrgGenerating(true);
            const result = await generateOrganizer(payload);
            if (onGenerated) onGenerated(result);
            setOrgTopic('');
            setOrgObjective('');
        } catch (error) {
            console.error('Organizer generation failed', error);
            const msg = error.response?.data?.error || 'Ошибка при генерации органайзера';
            alert(msg);
        } finally {
            setIsOrgGenerating(false);
        }
    };

    const handleGenerateGame = async () => {
        if (!selectedGame) {
            alert('Выберите тип игры');
            return;
        }
        const topic = gameTopic.trim();
        if (!topic) {
            alert('Введите тему или основную идею');
            return;
        }
        const payload = {
            game_type: selectedGame.id,
            topic,
            learning_objective: gameObjective.trim() || undefined,
            grade: params.grade || '',
            language: params.language || 'Русский',
            subject: params.subject || '',
        };
        if (files.length > 0) {
            const file_contents = [];
            for (const file of files) {
                try {
                    const isText = (file.type && (TEXT_TYPES.includes(file.type) || file.type.startsWith('text/'))) || /\.(txt|md|json|html|csv)$/i.test(file.name);
                    if (isText) {
                        const text = await readFileAsText(file);
                        file_contents.push({ name: file.name, mime_type: file.type || 'text/plain', content_text: text });
                    } else {
                        const b64 = await readFileAsBase64(file);
                        file_contents.push({ name: file.name, mime_type: file.type || 'application/octet-stream', content_base64: b64 });
                    }
                } catch (err) {
                    console.error(err);
                    alert(`Ошибка чтения файла ${file.name}`);
                }
            }
            if (file_contents.length) payload.file_contents = file_contents;
        }
        try {
            setIsGameGenerating(true);
            const result = await generateGame(payload);
            if (onGenerated) onGenerated(result);
            setGameTopic('');
            setGameObjective('');
        } catch (error) {
            console.error('Game generation failed', error);
            const msg = error.response?.data?.error || 'Ошибка при генерации игры';
            alert(msg);
        } finally {
            setIsGameGenerating(false);
        }
    };

    return (
        <aside className="flex flex-col bg-white border-r border-slate-200 shrink-0 relative w-full md:w-[40rem] lg:w-[48rem] shadow-sm z-10">
            {/* Top-level Tab Bar */}
            <div className="px-5 pt-5 border-b border-slate-200">
                <div className="flex gap-6 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('tools')}
                        className={`pb-3 text-base font-bold border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'tools'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            <span>Инструменты</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('organizer')}
                        className={`pb-3 text-base font-bold border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'organizer'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                            <span>Органайзер</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('games')}
                        className={`pb-3 text-base font-bold border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'games'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                            <span>Игры</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* ============================================================
                TAB: ИНСТРУМЕНТЫ
            ============================================================ */}
            {activeTab === 'tools' && (
                <>
                    {/* Search */}
                    <div className="p-5 bg-slate-50/50">
                        <div className="relative group">
                            <svg className="h-6 w-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Поиск инструментов..."
                                className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tool Cards */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-48 flex flex-col gap-4 content-start bg-slate-50/50">
                        {filteredTools.map((tool) => {
                            const isActive = selectedTool === tool.id;
                            const colors = COLOR_MAP[tool.color] || COLOR_MAP.orange;
                            return (
                                <div key={tool.id} className="flex flex-col gap-3">
                                    <button
                                        onClick={() => setSelectedTool(tool.id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all group text-left relative overflow-hidden ${
                                            isActive
                                                ? `bg-white ${colors.activeBorder} ${colors.shadow} border-2`
                                                : 'bg-white border-slate-200 hover:border-orange-300'
                                        }`}
                                    >
                                        {isActive && <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-orange-500" />}
                                        <div className={`flex items-start gap-4 ${isActive ? 'pl-2' : ''}`}>
                                            <div className={`size-12 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text} shrink-0`}>
                                                {TOOL_ICONS[tool.id]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className={`text-base font-bold transition-colors truncate ${isActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                                                        {tool.name}
                                                    </h4>
                                                    {tool.badge && (
                                                        <span className={`text-xs font-black px-2 py-0.5 rounded ml-2 shrink-0 ${
                                                            tool.badge === 'POPULAR' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                                                        }`}>{tool.badge}</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 leading-snug">{tool.description}</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Доп. параметры под выбранным инструментом */}
                                    {isActive && tool.id === 'sor_soch' && (
                                        <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                                            <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Параметры СОР/СОЧ</h4>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 mb-1">Таксономия Блума</label>
                                                <select
                                                    className="w-full text-sm rounded-lg border-slate-300 py-2 focus:ring-blue-500 focus:border-blue-500"
                                                    value={assessmentParams.bloom_level}
                                                    onChange={(e) => setAssessmentParam('bloom_level', e.target.value)}
                                                >
                                                    <option value="Знание">Знание (Remembering)</option>
                                                    <option value="Понимание">Понимание (Understanding)</option>
                                                    <option value="Применение">Применение (Applying)</option>
                                                    <option value="Анализ">Анализ (Analyzing)</option>
                                                    <option value="Оценка">Оценка (Evaluating)</option>
                                                    <option value="Создание">Создание (Creating)</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { key: 'radio', label: 'Выбор ответа' },
                                                    { key: 'on_the_sequence', label: 'Последовательность' },
                                                    { key: 'cross', label: 'Соответствие' },
                                                    { key: 'bloom_mini', label: 'Короткий ответ' },
                                                    { key: 'bloom', label: 'Развёрнутый ответ' },
                                                ].map(({ key, label }) => (
                                                    <div key={key}>
                                                        <label className="block text-sm font-medium text-slate-500 mb-0.5">{label}</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={10}
                                                            className="w-full text-sm rounded-lg border-slate-300 py-2 focus:ring-blue-500 focus:border-blue-500"
                                                            value={assessmentParams[key]}
                                                            onChange={(e) => setAssessmentParam(key, parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {filteredTools.length === 0 && (
                            <p className="text-base text-slate-400 text-center py-8">Инструменты не найдены</p>
                        )}
                    </div>

                    {/* Prompt input area */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-200 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
                            <textarea
                                className="w-full bg-transparent border-none focus:ring-0 text-base outline-none resize-none h-24 placeholder:text-slate-400 mb-2"
                                placeholder="Дополнительные условия: Введите тему урока или особые требования..."
                                value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                disabled={isGenerating}
                            />

                            {files.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1.5">
                                    {files.map((f) => (
                                        <span key={f.name} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-sm text-slate-700">
                                            <span className="truncate max-w-[120px]" title={f.name}>{f.name}</span>
                                            <button type="button" onClick={() => removeFile(f.name)} className="text-slate-500 hover:text-slate-800" aria-label="Удалить">&times;</button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-wrap">
                                    <input type="file" ref={fileInputRef} onChange={onFileSelect} multiple accept=".txt,.md,.pdf,.doc,.docx,image/*,text/*,application/pdf" className="hidden" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isGenerating || files.length >= MAX_FILES} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-lg border border-slate-200 shadow-sm disabled:opacity-50" title="Загрузить файл">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    </button>
                                    <div className="h-4 w-px bg-slate-200 mx-1" />
                                    <button type="button" onClick={openParamsModal} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-orange-300 rounded-lg whitespace-nowrap shadow-sm transition-all group">
                                        <span className="text-orange-600 group-hover:text-orange-700">Параметры</span>
                                        <svg className="h-4 w-4 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className={`text-white text-base font-bold px-6 py-2.5 rounded-lg shadow-lg shrink-0 transition-transform active:scale-95 ${isGenerating ? 'bg-orange-400 cursor-wait' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'}`}
                                >
                                    {isGenerating ? 'Генерация...' : 'Создать'}
                                </button>
                            </div>
                            {((params.grade || '').trim() || (params.subject || '').trim() || (params.language || '').trim()) && (
                                <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-600">
                                    {(params.grade || '').trim() && <span>Класс: <strong className="text-slate-800">{params.grade}</strong></span>}
                                    {(params.subject || '').trim() && <span>Предмет: <strong className="text-slate-800">{params.subject}</strong></span>}
                                    {(params.language || '').trim() && <span>Язык: <strong className="text-slate-800">{params.language}</strong></span>}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ============================================================
                TAB: ИГРЫ
            ============================================================ */}
            {activeTab === 'games' && (
                <>
                    <div className="p-5 bg-slate-50/50">
                        <div className="relative group">
                            <svg className="h-6 w-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Поиск игр..."
                                className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                value={gameSearch}
                                onChange={(e) => setGameSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-52" style={{background: '#FDF7F0'}}>
                        {filteredGames.length === 0 ? (
                            <p className="text-base text-slate-400 text-center py-8">Игры не найдены</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-3 pt-2">
                                {filteredGames.map((game) => (
                                    <GameCard
                                        key={game.id}
                                        game={game}
                                        isActive={selectedGame?.id === game.id}
                                        onClick={() => setSelectedGame(game)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-200 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
                            <textarea
                                className="w-full bg-transparent border-none focus:ring-0 text-base outline-none resize-none h-24 placeholder:text-slate-400 mb-2"
                                placeholder="Дополнительные условия: Введите тему урока или особые требования..."
                                value={gameTopic}
                                onChange={(e) => setGameTopic(e.target.value)}
                                disabled={isGameGenerating}
                            />
                            {files.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1.5">
                                    {files.map((f) => (
                                        <span key={f.name} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-sm text-slate-700">
                                            <span className="truncate max-w-[120px]" title={f.name}>{f.name}</span>
                                            <button type="button" onClick={() => removeFile(f.name)} className="text-slate-500 hover:text-slate-800" aria-label="Удалить">&times;</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-wrap">
                                    <input type="file" ref={fileInputRef} onChange={onFileSelect} multiple accept=".txt,.md,.pdf,.doc,.docx,image/*,text/*,application/pdf" className="hidden" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isGameGenerating || files.length >= MAX_FILES} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-lg border border-slate-200 shadow-sm disabled:opacity-50" title="Загрузить файл">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    </button>
                                    <div className="h-4 w-px bg-slate-200 mx-1" />
                                    <button type="button" onClick={openParamsModal} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-orange-300 rounded-lg whitespace-nowrap shadow-sm transition-all group">
                                        <span className="text-orange-600 group-hover:text-orange-700">Параметры</span>
                                        <svg className="h-4 w-4 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                                <button
                                    onClick={handleGenerateGame}
                                    disabled={isGameGenerating || !selectedGame || !gameTopic.trim()}
                                    className={`text-white text-base font-bold px-6 py-2.5 rounded-lg shadow-lg shrink-0 transition-transform active:scale-95 ${isGameGenerating || !selectedGame || !gameTopic.trim() ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'}`}
                                >
                                    {isGameGenerating ? 'Генерация...' : 'Создать'}
                                </button>
                            </div>
                            {((params.grade || '').trim() || (params.subject || '').trim() || (params.language || '').trim()) && (
                                <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-600">
                                    {(params.grade || '').trim() && <span>Класс: <strong className="text-slate-800">{params.grade}</strong></span>}
                                    {(params.subject || '').trim() && <span>Предмет: <strong className="text-slate-800">{params.subject}</strong></span>}
                                    {(params.language || '').trim() && <span>Язык: <strong className="text-slate-800">{params.language}</strong></span>}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ============================================================
                TAB: ОРГАНАЙЗЕР
            ============================================================ */}
            {activeTab === 'organizer' && (
                <>
                    <div className="p-5 bg-slate-50/50">
                        <div className="relative group">
                            <svg className="h-6 w-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Поиск органайзеров..."
                                className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                value={orgSearch}
                                onChange={(e) => setOrgSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-52" style={{background: '#FDF7F0'}}>
                        {filteredOrganizers.length === 0 ? (
                            <p className="text-base text-slate-400 text-center py-8">Органайзеры не найдены</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-3 pt-2">
                                {filteredOrganizers.map((org) => (
                                    <OrganizerCard
                                        key={org.id}
                                        org={org}
                                        isActive={selectedOrganizer?.id === org.id}
                                        onClick={() => setSelectedOrganizer(org)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-200 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
                            <textarea
                                className="w-full bg-transparent border-none focus:ring-0 text-base outline-none resize-none h-24 placeholder:text-slate-400 mb-2"
                                placeholder="Дополнительные условия: Введите тему урока или особые требования..."
                                value={orgTopic}
                                onChange={(e) => setOrgTopic(e.target.value)}
                                disabled={isOrgGenerating}
                            />
                            {files.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1.5">
                                    {files.map((f) => (
                                        <span key={f.name} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-sm text-slate-700">
                                            <span className="truncate max-w-[120px]" title={f.name}>{f.name}</span>
                                            <button type="button" onClick={() => removeFile(f.name)} className="text-slate-500 hover:text-slate-800" aria-label="Удалить">&times;</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-wrap">
                                    <input type="file" ref={fileInputRef} onChange={onFileSelect} multiple accept=".txt,.md,.pdf,.doc,.docx,image/*,text/*,application/pdf" className="hidden" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isOrgGenerating || files.length >= MAX_FILES} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-lg border border-slate-200 shadow-sm disabled:opacity-50" title="Загрузить файл">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    </button>
                                    <div className="h-4 w-px bg-slate-200 mx-1" />
                                    <button type="button" onClick={openParamsModal} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-orange-300 rounded-lg whitespace-nowrap shadow-sm transition-all group">
                                        <span className="text-orange-600 group-hover:text-orange-700">Параметры</span>
                                        <svg className="h-4 w-4 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                                <button
                                    onClick={handleGenerateOrganizer}
                                    disabled={isOrgGenerating || !selectedOrganizer || !orgTopic.trim()}
                                    className={`text-white text-base font-bold px-6 py-2.5 rounded-lg shadow-lg shrink-0 transition-transform active:scale-95 ${isOrgGenerating || !selectedOrganizer || !orgTopic.trim() ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'}`}
                                >
                                    {isOrgGenerating ? 'Генерация...' : 'Создать'}
                                </button>
                            </div>
                            {((params.grade || '').trim() || (params.subject || '').trim() || (params.language || '').trim()) && (
                                <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-600">
                                    {(params.grade || '').trim() && <span>Класс: <strong className="text-slate-800">{params.grade}</strong></span>}
                                    {(params.subject || '').trim() && <span>Предмет: <strong className="text-slate-800">{params.subject}</strong></span>}
                                    {(params.language || '').trim() && <span>Язык: <strong className="text-slate-800">{params.language}</strong></span>}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
}
