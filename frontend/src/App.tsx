import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { AlarmDetailPage } from './pages/AlarmDetailPage';
import { AlarmListPage } from './pages/AlarmListPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { IssueListPage } from './pages/IssueListPage';
import { DevPanel } from './components/DevPanel';

function DevPanelGate() {
  const [params] = useSearchParams();
  if (params.get('dev') !== '1') return null;
  return <DevPanel />;
}

export function App() {
  return (
    <BrowserRouter>
      <DevPanelGate />
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
