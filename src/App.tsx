import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CommandPalette from "@/components/CommandPalette";
import CookieConsent from "./components/CookieConsent";
import Index from "./pages/Index";

// Lazy-loaded routes for code splitting
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
const MissionDebrief = lazy(() => import("./pages/MissionDebrief"));
const MissionAnalysis = lazy(() => import("./pages/MissionAnalysis"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CommandPalette />
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
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
              <Route path="/quiz/:id" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
              <Route path="/league" element={<ProtectedRoute><League /></ProtectedRoute>} />
              <Route path="/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
              <Route path="/mission/:id/debrief" element={<ProtectedRoute><MissionDebrief /></ProtectedRoute>} />
              <Route path="/mission/:id/analysis" element={<ProtectedRoute><MissionAnalysis /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
