import { Outlet } from 'react-router-dom';

import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

