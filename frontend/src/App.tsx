import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import Tournaments from "@/pages/Tournaments";
import TournamentsAuth from "@/pages/TournamentsAuth";
import MyTournaments from "@/pages/MyTournaments";
import Tasks from "@/pages/Tasks";
import TasksCreate from "@/pages/TasksCreate";
import Subscription from "@/pages/Subscription";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import Progress from "@/pages/Progress";
import AdminSubscriptions from "@/pages/AdminSubscriptions";
import CodeExecutionPage from "@/pages/CodeExecutionPage";
import TournamentTasks from "@/pages/TournamentTasks";
import TaskSolve from "@/pages/TaskSolve";
import Certificates from "@/pages/Certificates";
import Students from "@/pages/Students";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import Ratings from "@/pages/Ratings";
import '@/i18n';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/tournaments"
              element={<Tournaments />}
            />
            <Route
              path="/tournaments/:tournamentId"
              element={
                <AppLayout>
                  <TournamentTasks />
                </AppLayout>
              }
            />
            <Route
              path="/tournaments/:tournamentId/tasks/:taskId"
              element={
                <AppLayout>
                  <TaskSolve />
                </AppLayout>
              }
            />
            <Route
              path="/my-tournaments"
              element={
                <AppLayout>
                  <MyTournaments />
                </AppLayout>
              }
            />
            <Route
              path="/tasks"
              element={
                <AppLayout>
                  <Tasks />
                </AppLayout>
              }
            />
            <Route
              path="/tasks/create"
              element={
                <AppLayout>
                  <TasksCreate />
                </AppLayout>
              }
            />
            <Route
              path="/tasks/:id/edit"
              element={
                <AppLayout>
                  <TasksCreate />
                </AppLayout>
              }
            />
            <Route
              path="/subscription"
              element={
                <AppLayout>
                  <Subscription />
                </AppLayout>
              }
            />
            <Route
              path="/subscription/success"
              element={
                <AppLayout>
                  <SubscriptionSuccess />
                </AppLayout>
              }
            />
            <Route
              path="/progress"
              element={
                <AppLayout>
                  <Progress />
                </AppLayout>
              }
            />
            <Route
              path="/admin/subscriptions"
              element={
                <AppLayout>
                  <AdminSubscriptions />
                </AppLayout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/code-execution"
              element={
                <AppLayout>
                  <CodeExecutionPage />
                </AppLayout>
              }
            />
            <Route
              path="/students"
              element={
                <AppLayout>
                  <Students />
                </AppLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AppLayout>
                  <Profile />
                </AppLayout>
              }
            />
            <Route
              path="/rating"
              element={
                <AppLayout>
                  <Ratings />
                </AppLayout>
              }
            />
            <Route
              path="/certificates"
              element={
                <AppLayout>
                  <Certificates />
                </AppLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
