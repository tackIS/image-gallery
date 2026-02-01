import { Routes, Route } from 'react-router-dom';
import MainGallery from './components/MainGallery';
import GroupAlbumView from './components/GroupAlbumView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainGallery />} />
      <Route path="/group/:id" element={<GroupAlbumView />} />
    </Routes>
  );
}

export default App;
