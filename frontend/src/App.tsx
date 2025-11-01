import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Communities from './pages/Communities';
import Meeting from './pages/Meeting';
import Calendar from './pages/Calendar';
import Header from './components/Header';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/meeting/:meetingId" element={<Meeting />} />
          <Route path="/calendar" element={<Calendar />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

