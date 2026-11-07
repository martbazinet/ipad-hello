import { useEffect, useState } from 'react';
import { useAppData } from './store';
import { requestPersistence } from './storage';
import { Dashboard } from './components/Dashboard';
import { RoomView } from './components/RoomView';
import { SettingsView } from './components/SettingsView';
import { CalendarView } from './components/CalendarView';
import { TimelineView } from './components/TimelineView';

type View =
  | { page: 'dashboard' }
  | { page: 'room'; roomId: string }
  | { page: 'calendar' }
  | { page: 'timeline' }
  | { page: 'settings' };

export function App() {
  const { data, setData, update, saveError } = useAppData();
  const [view, setView] = useState<View>({ page: 'dashboard' });

  useEffect(() => {
    requestPersistence();
  }, []);
  // Braces matter: newer Chrome returns a Promise from scrollTo, which React would treat as a cleanup.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const home = () => setView({ page: 'dashboard' });
  const openRoom = (id: string) => setView({ page: 'room', roomId: id });
  const openCalendar = () => setView({ page: 'calendar' });
  const active = (page: View['page']) => (view.page === page || (page === 'dashboard' && view.page === 'room') ? 'active' : '');

  return (
    <>
      <header className="topbar">
        <h1 onClick={home}>
          Renovation Tracker <span className="app-version">v {__APP_VERSION__}</span>
        </h1>
        <nav>
          <button className={active('dashboard')} onClick={home}>
            Dashboard
          </button>
          <button className={active('calendar')} onClick={openCalendar}>
            Calendar
          </button>
          <button className={active('timeline')} onClick={() => setView({ page: 'timeline' })}>
            Timeline
          </button>
          <button className={active('settings')} onClick={() => setView({ page: 'settings' })}>
            Settings & backup
          </button>
        </nav>
      </header>
      {saveError && <div className="banner error">{saveError}</div>}
      <main>
        {view.page === 'dashboard' && <Dashboard data={data} update={update} openRoom={openRoom} openCalendar={openCalendar} />}
        {view.page === 'room' && <RoomView data={data} roomId={view.roomId} update={update} back={home} />}
        {view.page === 'calendar' && <CalendarView data={data} update={update} openRoom={openRoom} />}
        {view.page === 'timeline' && <TimelineView data={data} openRoom={openRoom} />}
        {view.page === 'settings' && <SettingsView data={data} update={update} replaceData={setData} />}
      </main>
    </>
  );
}
