import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminRoute } from '@/components/AdminRoute'

import Index from './pages/Index'
import Pipeline from './pages/Pipeline'
import Deals from './pages/Deals'
import Contacts from './pages/Contacts'
import Activities from './pages/Activities'
import Visitas from './pages/Visitas'
import Contratos from './pages/Contratos'
import OrdensServico from './pages/OrdensServico'
import Metas from './pages/Metas'
import UsersPage from './pages/Users'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/visitas" element={<Visitas />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/ordens-servico" element={<OrdensServico />} />
              <Route path="/metas" element={<Metas />} />

              <Route element={<AdminRoute />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
