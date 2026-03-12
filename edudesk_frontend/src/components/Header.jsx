import { Link, useNavigate } from 'react-router-dom';
import { getStoredUser, setAuthToken } from '../services/api';

export default function Header() {
  const navigate = useNavigate();
  const { token, username } = getStoredUser();

  const handleLogout = () => {
    setAuthToken(null);
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#1e293b] border-b border-slate-700 shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-1">
          <h2 className="text-xl font-bold leading-tight tracking-tight">
            <span className="text-orange-400">i</span>
            <span className="text-white">Sabaq</span>
            <span className="text-orange-400">.kz</span>
          </h2>
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-4">
          <Link to="/" className="text-white border-b-2 border-orange-500 pb-1 text-base font-medium transition-colors">
            Новый урок
          </Link>
          <Link to="/history" className="text-slate-300 hover:text-white text-base font-medium transition-colors">
            История
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 bg-[#334155] text-orange-400 border border-orange-500/50 px-4 py-2 rounded-md text-base font-medium hover:bg-slate-700 transition-all">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
          </svg>
          <span>Upgrade</span>
        </button>

        {token ? (
          <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
            <div className="flex flex-col items-end hidden sm:block">
              <p className="text-sm font-semibold text-white leading-none">{username || 'Учитель'}</p>
              <p className="text-xs text-slate-400 uppercase mt-0.5">Teacher</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white text-base font-medium" title="Выйти">
              Выйти
            </button>
            <div className="size-10 bg-orange-700 rounded-full flex items-center justify-center border-2 border-transparent text-white font-bold text-sm">
              {(username || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        ) : (
          <Link to="/login" className="px-4 py-2 rounded-lg bg-orange-500 text-white text-base font-bold hover:bg-orange-600 transition-colors">
            Войти
          </Link>
        )}
      </div>
    </header>
  )
}
