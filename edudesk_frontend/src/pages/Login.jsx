import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setAuthToken } from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim() || !password) {
            setError('Введите логин и пароль');
            return;
        }
        setLoading(true);
        try {
            const data = await login(username.trim(), password);
            setAuthToken(data.token, data.username);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка входа. Проверьте логин и пароль.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 overflow-y-auto flex items-center justify-center p-6 bg-slate-50">
            <div className="w-full max-w-md">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Вход в EduDesk.kz</h1>
                    <p className="text-slate-500 text-sm mb-6">Введите логин и пароль. Если аккаунта нет, он будет создан при первом входе.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Логин</label>
                            <input
                                data-testid="login-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full rounded-xl border-slate-300 text-slate-800 focus:ring-orange-500 focus:border-orange-500 shadow-sm"
                                placeholder="Имя пользователя"
                                autoComplete="username"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Пароль</label>
                            <input
                                data-testid="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border-slate-300 text-slate-800 focus:ring-orange-500 focus:border-orange-500 shadow-sm"
                                placeholder="Пароль"
                                autoComplete="current-password"
                            />
                        </div>
                        {error && (
                            <p className="text-red-600 text-sm font-medium">{error}</p>
                        )}
                        <button
                            data-testid="login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Вход...' : 'Войти'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-slate-500 text-sm">
                        Нет аккаунта? Введите логин и пароль и нажмите «Войти» — аккаунт создастся автоматически.
                    </p>
                </div>
            </div>
        </main>
    );
}
