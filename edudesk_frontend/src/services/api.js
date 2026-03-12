import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/?$/, '/');

axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

const token = localStorage.getItem('edudesk_token');
if (token) {
    axios.defaults.headers.common['Authorization'] = `Token ${token}`;
}

axios.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('edudesk_token');
            localStorage.removeItem('edudesk_username');
            delete axios.defaults.headers.common['Authorization'];
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    }
);

export const setAuthToken = (token, username = null) => {
    if (token) {
        localStorage.setItem('edudesk_token', token);
        if (username != null) localStorage.setItem('edudesk_username', username);
        axios.defaults.headers.common['Authorization'] = `Token ${token}`;
    } else {
        localStorage.removeItem('edudesk_token');
        localStorage.removeItem('edudesk_username');
        delete axios.defaults.headers.common['Authorization'];
    }
};

export const getStoredUser = () => ({
    token: localStorage.getItem('edudesk_token'),
    username: localStorage.getItem('edudesk_username'),
});

export const getHistory = async () => {
    const response = await axios.get('history/');
    return response.data;
};

export const getLesson = async (id) => {
    const response = await axios.get(`history/${id}/`);
    return response.data;
};

export const generateLesson = async (params) => {
    const response = await axios.post('generate/lesson/', params);
    return response.data;
};

export const generateAssessment = async (params) => {
    const response = await axios.post('generate/assessment/', params);
    return response.data;
};

export const generateFormative = async (params) => {
    const response = await axios.post('generate/formative/', params);
    return response.data;
};

export const generateStructural = async (params) => {
    const response = await axios.post('generate/structural/', params);
    return response.data;
};

export const generatePresentation = async (params) => {
    const response = await axios.post('generate/presentation/', params);
    return response.data;
};

export const generateFeedback = async (params) => {
    const response = await axios.post('generate/feedback/', params);
    return response.data;
};

export const generateOrganizer = async (params) => {
    const response = await axios.post('generate/organizer/', params);
    return response.data;
};

export const generateGame = async (params) => {
    const response = await axios.post('generate/game/', params);
    return response.data;
};

export const deleteLesson = async (id) => {
    const response = await axios.delete(`history/${id}/`);
    return response.data;
};

/** Скачивание плана урока в Word (с авторизацией). */
export const downloadLessonExport = async (id, filename = 'plan.docx') => {
    const response = await axios.get(`history/${id}/export/?format=docx`, { responseType: 'blob' });
    if (response.status !== 200) {
        const text = typeof response.data?.text === 'function' ? await response.data.text() : '';
        let errMsg = 'Не удалось скачать файл';
        if (text) {
            try {
                const j = JSON.parse(text);
                errMsg = j.error || j.detail || errMsg;
            } catch {
                errMsg = text.slice(0, 200);
            }
        }
        throw new Error(errMsg);
    }
    if (!(response.data instanceof Blob) || response.data.size === 0) {
        throw new Error('Пустой ответ от сервера');
    }
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
};

export const login = async (username, password) => {
    const response = await axios.post('auth/login/', { username, password });
    return response.data;
};
