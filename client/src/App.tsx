import { Link, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Layout';
import { Empty } from './components/ui';
import { RequireAuth } from './lib/session';
import { AccountPage, LoginPage, RegisterPage, SavedPage } from './pages/Account';
import { AdminPage } from './pages/Admin';
import { DestinationPage, DestinationsPage } from './pages/Destinations';
import { HostPage } from './pages/Host';
import { AboutPage, HelpPage } from './pages/Info';
import { CheckoutPage } from './pages/Checkout';
import { ConfirmationPage } from './pages/Confirmation';
import { HomePage } from './pages/Home';
import { MapPage } from './pages/MapView';
import { MessagesPage } from './pages/Messages';
import { PlannerPage } from './pages/Planner';
import { PropertyPage } from './pages/Property';
import { RoomsPage } from './pages/Rooms';
import { SearchPage } from './pages/Search';
import { TripsPage } from './pages/Trips';

const NotFound = () => (
  <div className="page" style={{ paddingTop: 48 }}>
    <Empty title="We couldn’t find that page"><Link className="btn" to="/">Back to search</Link></Empty>
  </div>
);

export function App() {
  return (
    <Routes>
      <Route element={<Shell tabs />}>
        <Route index element={<HomePage />} />
      </Route>
      <Route element={<Shell footer={false} />}>
        <Route path="planner" element={<PlannerPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
      </Route>
      <Route element={<Shell />}>
        <Route path="search" element={<SearchPage />} />
        <Route path="stays/:slug" element={<PropertyPage />} />
        <Route path="stays/:slug/rooms" element={<RoomsPage />} />
        <Route path="stays/:slug/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
        <Route path="bookings/:id/confirmation" element={<RequireAuth><ConfirmationPage /></RequireAuth>} />
        <Route path="trips" element={<RequireAuth><TripsPage /></RequireAuth>} />
        <Route path="saved" element={<RequireAuth><SavedPage /></RequireAuth>} />
        <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="destinations" element={<DestinationsPage />} />
        <Route path="destinations/:slug" element={<DestinationPage />} />
        <Route path="host" element={<HostPage />} />
        <Route path="admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
        <Route path="help" element={<HelpPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
