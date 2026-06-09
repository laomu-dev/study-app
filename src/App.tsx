import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "./store";
import { api } from "./lib/api";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Study } from "./pages/Study";
import { Questions } from "./pages/Questions";
import { Quiz } from "./pages/Quiz";
import { MaterialGenerator } from "./pages/MaterialGenerator";
import { WrongQuestions } from "./pages/WrongQuestions";
import { AiTutor } from "./pages/AiTutor";
import { KnowledgeMap } from "./pages/KnowledgeMap";
import { TopicStudy } from "./pages/TopicStudy";

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user } = useAppStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { user, setUser } = useAppStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result: any = await api.auth.getMe();
      setUser(result.user);
    } catch (error) {
      setUser(null);
    }
  };

  return (
    <Router>
      <div className="min-h-screen">
        {user && <Navbar />}
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <Login />} 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/study" 
            element={
              <ProtectedRoute>
                <Study />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/quiz"
            element={
              <ProtectedRoute>
                <Quiz />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/questions" 
            element={
              <ProtectedRoute>
                <Questions />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/materials"
            element={
              <ProtectedRoute>
                <MaterialGenerator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wrong"
            element={
              <ProtectedRoute>
                <WrongQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-tutor"
            element={
              <ProtectedRoute>
                <AiTutor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge-map"
            element={
              <ProtectedRoute>
                <KnowledgeMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topic-study"
            element={
              <ProtectedRoute>
                <TopicStudy />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}
