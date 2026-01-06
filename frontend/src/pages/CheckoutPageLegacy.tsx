import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Legacy CheckoutPage component - now redirects to new multi-route checkout flow
 * This ensures backward compatibility with any existing links to /checkout
 */
const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect to the new authentication-first checkout flow
  useEffect(() => {
    navigate('/checkout/login', { 
      state: location.state, 
      replace: true 
    });
  }, [navigate, location.state]);

  // Return null while redirecting
  return null;
};

export default CheckoutPage;