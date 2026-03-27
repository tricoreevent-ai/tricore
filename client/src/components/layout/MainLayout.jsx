import { Outlet } from 'react-router-dom';

import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

export default function MainLayout() {
  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50">
      <Navbar />
      <main className="min-w-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
