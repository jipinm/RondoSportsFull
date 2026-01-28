import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/customerAuth';
import type { Ticket } from '../services/apiRoutes';
import type { GuestFormData } from '../utils/validation';

interface CartItem {
  ticket: Ticket;
  quantity: number;
}

interface CartItem {
  ticket: Ticket;
  quantity: number;
  finalPriceUSD?: number;
  markupAmount?: number;
}

interface CheckoutState {
  cartItems: CartItem[];
  eventData: {
    event_name: string;
    tournament_name: string;
    season: string;
    date_start: string;
    venue_name: string;
    city: string;
  };
  guests: GuestFormData[];
  guestRequirements?: import('../services/apiRoutes').EventGuestRequirements | null;
  userInfo?: any;
  markupsData?: Record<string, any>;
}

/**
 * CheckoutReservationPage - Legacy component now redirects to new checkout flow
 * 
 * Note: Reservation creation is now handled within the payment processing step.
 * This page redirects users to the appropriate step in the new flow.
 */
const CheckoutReservationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState;

  const { isAuthenticated } = useAuth();

  // Redirect to appropriate step in new checkout flow
  useEffect(() => {
    if (!isAuthenticated) {
      // Not authenticated - go to login
      navigate('/checkout/login', { 
        state: state ? { cartItems: state.cartItems, eventData: state.eventData, guestRequirements: state.guestRequirements } : null 
      });
      return;
    }
    
    if (!state?.guests || state.guests.length === 0) {
      // No guest data - go to guest details
      navigate('/checkout/guest-details', { state });
      return;
    }
    
    // Has guest data - go to payment
    navigate('/checkout/payment', { state });
  }, [isAuthenticated, state, navigate]);

  // Return null while redirecting
  return null;
};

export default CheckoutReservationPage;