import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { Home } from './pages/Home';
import { ArtistDetail } from './pages/ArtistDetail';
import { LibraryPage } from './pages/Library';
import { About } from './pages/About';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/artist/:slug" element={<ArtistDetail />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
