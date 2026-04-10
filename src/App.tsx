import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { AlarmDetailPage } from './pages/AlarmDetailPage';
import { AlarmListPage } from './pages/AlarmListPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { IssueListPage } from './pages/IssueListPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/issues" replace />} />
        <Route element={<AppShell />}>
          <Route path="/issues" element={<IssueListPage />} />
          <Route path="/issues/:id" element={<IssueDetailPage />} />
          <Route path="/alarms" element={<AlarmListPage />} />
          <Route path="/alarms/:id" element={<AlarmDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
