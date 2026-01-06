import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './services/customerAuth';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './components/home/HomePage';
import TournamentsPage from './pages/TournamentsPage';
import EventsPage from './pages/EventsPage';
import EventTicketsPage from './pages/EventTicketsPage';
import AllSportsPage from './pages/AllSportsPage';
import TeamsPage from './pages/TeamsPage';
import AboutUsPage from './pages/AboutUsPage';
import FAQPage from './pages/FAQPage';
import ContactUsPage from './pages/ContactUsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutLoginPage from './pages/CheckoutLoginPage';
import CheckoutGuestDetailsPage from './pages/CheckoutGuestDetailsPage';
import CheckoutReservationPage from './pages/CheckoutReservationPage';
import CheckoutPaymentPage from './pages/CheckoutPaymentPage';
import CheckoutConfirmationPage from './pages/CheckoutConfirmationPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import TestRegistrationPage from './pages/TestRegistrationPage';
import TestStripeCheckout from './pages/TestStripeCheckout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import BookingsPage from './pages/BookingsPage';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about-us" element={<AboutUsPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contact-us" element={<ContactUsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-conditions" element={<TermsConditionsPage />} />
            <Route path="/sports" element={<AllSportsPage />} />
            <Route path="/sports/:sport/tournaments" element={<TournamentsPage />} />
            <Route path="/tournaments/:tournamentId/events" element={<EventsPage />} />
            <Route path="/tournaments/:tournamentId/teams" element={<TournamentsPage />} />
            <Route path="/teams/:teamId/events" element={<EventsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/events/:eventId/tickets" element={<EventTicketsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/login" element={<CheckoutLoginPage />} />
            <Route path="/checkout/guest-details" element={<CheckoutGuestDetailsPage />} />
            <Route path="/checkout/reservation" element={<CheckoutReservationPage />} />
            <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />
            <Route path="/checkout/confirmation" element={<CheckoutConfirmationPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/cancel" element={<PaymentCancelPage />} />
            <Route path="/test-registration" element={<TestRegistrationPage />} />
            <Route path="/test-stripe" element={<TestStripeCheckout />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<ProfileEditPage />} />
            <Route path="/profile/change-password" element={<ChangePasswordPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/booking/confirmation/:bookingId" element={<BookingConfirmationPage />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
};

export default App;
