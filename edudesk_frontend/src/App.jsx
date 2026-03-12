import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LessonParamsProvider } from './context/LessonParamsContext';
import Header from './components/Header';
import NewLesson from './pages/NewLesson';
import History from './pages/History';
import ViewLesson from './pages/ViewLesson';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <LessonParamsProvider>
        <div className="font-display bg-background-light text-slate-900 overflow-hidden h-screen flex flex-col">
          <Header />
          <Routes>
            <Route path="/" element={<NewLesson />} />
            <Route path="/history" element={<History />} />
            <Route path="/lesson/:id" element={<ViewLesson />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </LessonParamsProvider>
    </Router>
  );
}

export default App;
