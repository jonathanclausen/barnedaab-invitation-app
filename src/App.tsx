import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import InvitePage from './pages/InvitePage'

// Admin trækker Firebase Auth med, så gæster slipper for at hente det
const AdminPage = lazy(() => import('./pages/AdminPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/i/:inviteId" element={<InvitePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
