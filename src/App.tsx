import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ImmersionProvider, AmbientCanvas, PageTransition, AudioProvider } from "@/experience";

import CommandPalette from "@/components/CommandPalette";
import CookieConsent from "./components/CookieConsent";
import PageLoadingFallback from "@/components/PageLoadingFallback";
import { DevDiagnosticsPanel } from "@/components/DevDiagnosticsPanel";
import AdminRoute from "@/components/AdminRoute";
// Lazy-loaded routes for code splitting
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Create = lazy(() => import("./pages/Create"));
const Library = lazy(() => import("./pages/Library"));
const Player = lazy(() => import("./pages/Player"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Profile = lazy(() => import("./pages/Profile"));
const Studio = lazy(() => import("./pages/Studio"));
const League = lazy(() => import("./pages/League"));
const Export = lazy(() => import("./pages/Export"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Pricing = lazy(() => import("./pages/Pricing"));
const NotFound = lazy(() => import("./pages/NotFound"));
// COGNITIO pages
const MissionPlay = lazy(() => import("./pages/MissionPlay"));
const MissionDebrief = lazy(() => import("./pages/MissionDebrief"));
const MissionAnalysis = lazy(() => import("./pages/MissionAnalysis"));
const TransformationView = lazy(() => import("./pages/TransformationView"));
const CognitioLibrary = lazy(() => import("./pages/CognitioLibrary"));
const ReviewHub = lazy(() => import("./pages/ReviewHub"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const GuardianSettings = lazy(() => import("./pages/GuardianSettings"));
const EscapeGame = lazy(() => import("./pages/EscapeGame"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — avoid redundant refetches
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <ErrorBoundary>

  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImmersionProvider>
            <AudioProvider>
            <AmbientCanvas />
            <CommandPalette />
            <Suspense fallback={<PageLoadingFallback />}>
              <PageTransition>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/create" element={<ProtectedRoute><Create /></ProtectedRoute>} />
                  <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                  <Route path="/player/:id" element={<ProtectedRoute><Player /></ProtectedRoute>} />
                  <Route path="/quiz" element={<ProtectedRoute><ReviewHub /></ProtectedRoute>} />
                  <Route path="/quiz/:id" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
                  <Route path="/league" element={<ProtectedRoute><League /></ProtectedRoute>} />
                  <Route path="/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
                  <Route path="/mission/:id" element={<Navigate to="play" replace />} />
                  <Route path="/mission/:id/play" element={<ProtectedRoute><MissionPlay /></ProtectedRoute>} />
                  <Route path="/mission/:id/escape" element={<ProtectedRoute><EscapeGame /></ProtectedRoute>} />
                  <Route path="/mission/:id/debrief" element={<ProtectedRoute><MissionDebrief /></ProtectedRoute>} />
                  <Route path="/mission/:id/analysis" element={<ProtectedRoute><MissionAnalysis /></ProtectedRoute>} />
                  <Route path="/transformation/:id" element={<ProtectedRoute><TransformationView /></ProtectedRoute>} />
                  <Route path="/cognitio-library" element={<ProtectedRoute><CognitioLibrary /></ProtectedRoute>} />
                  <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                  <Route path="/guardian-settings" element={<ProtectedRoute><GuardianSettings /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PageTransition>
            </Suspense>
            <CookieConsent />
            <DevDiagnosticsPanel />
            </AudioProvider>
          </ImmersionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>

  </ErrorBoundary>
);

export default App;
