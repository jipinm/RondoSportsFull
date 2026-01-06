import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Ticket, EventGuestRequirements } from '../services/apiRoutes';
import GuestRequirementsPreview from './GuestRequirementsPreview';
import styles from './CartPanel.module.css';

interface CartItem {
  ticket: Ticket;
  quantity: number;
}

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (ticketId: string, quantity: number) => void;
  onRemoveItem: (ticketId: string) => void;
  onCheckout?: () => void;
  eventData?: {
    event_name: string;
    tournament_name: string;
    season: string;
    date_start: string;
    venue_name: string;
    city: string;
  };
  // Phase 1: Step 2 - Guest requirements preview
  guestRequirements?: EventGuestRequirements | null;
  guestRequirementsLoading?: boolean;
  guestRequirementsError?: string | null;
}

const CartPanel: React.FC<CartPanelProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  eventData,
  guestRequirements,
  guestRequirementsLoading,
  guestRequirementsError
}) => {
  const [eventTitle, setEventTitle] = useState('');
  const [showEventDetails, setShowEventDetails] = useState(false);

  useEffect(() => {
    if (eventData) {
      setEventTitle(eventData.event_name);
    } else if (cartItems.length > 0) {
      // Fallback to a generic title if no event data is provided
      setEventTitle('Event Tickets');
    }
  }, [cartItems, eventData]);

  // Format date for display
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate subtotal using actual ticket prices
  const subtotal = cartItems.reduce((total, item) => {
    return total + (item.ticket.face_value * item.quantity);
  }, 0);

  // Order total is just the subtotal (no additional booking costs)
  const orderTotal = subtotal;

  // Get currency from first ticket (assuming all tickets have same currency)
  const getCurrency = () => {
    if (!cartItems.length) {
      throw new Error('No cart items found for currency determination');
    }
    const currency = cartItems[0].ticket.currency_code;
    if (!currency) {
      throw new Error('Ticket currency is required');
    }
    return currency;
  };

  const formatPrice = (amount: number) => {
    const currency = getCurrency();
    return `${currency} ${amount.toFixed(2)}`;
  };

  const handleQuantityChange = (ticketId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(ticketId);
    } else {
      onUpdateQuantity(ticketId, newQuantity);
    }
  };

  const handleRemoveAll = () => {
    cartItems.forEach(item => onRemoveItem(item.ticket.ticket_id));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}
      
      {/* Cart Panel */}
      <div className={`${styles.cartPanel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.cartHeader}>
          <h2 className={styles.cartTitle}>My shopping cart</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.cartContent}>
          {cartItems.length === 0 ? (
            <div className={styles.emptyCart}>
              <p>Your cart is empty</p>
            </div>
          ) : (
            <>
              {/* Event Title */}
              <div className={styles.eventSection}>
                <h3 className={styles.eventTitle}>{eventTitle}</h3>
                
                <div className={styles.eventDetails}>
                  <div 
                    className={`${styles.detailItem} ${styles.toggleItem}`}
                    onClick={() => setShowEventDetails(!showEventDetails)}
                  >
                    <span>Show event details</span>
                    <span className={styles.toggleArrow}>
                      {showEventDetails ? '▼' : '▶'}
                    </span>
                  </div>
                  {showEventDetails && eventData && (
                    <>
                      <div className={styles.detailItem}>
                        <span className={styles.checkmark}>✓</span>
                        <span>{eventData.tournament_name} {eventData.season}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.checkmark}>✓</span>
                        <span>{formatEventDate(eventData.date_start)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.checkmark}>✓</span>
                        <span>{eventData.venue_name}, {eventData.city}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Cart Items */}
              <div className={styles.cartItems}>
                {cartItems.map(item => (
                  <div key={item.ticket.ticket_id} className={styles.cartItem}>
                    <div className={styles.itemInfo}>
                      <h4 className={styles.itemTitle}>{item.ticket.ticket_title}</h4>
                      <p className={styles.itemCategory}>{item.ticket.category_name}</p>
                    </div>
                    
                    <div className={styles.quantityControls}>
                      <button 
                        className={styles.quantityButton}
                        onClick={() => handleQuantityChange(item.ticket.ticket_id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className={styles.quantity}>{item.quantity}</span>
                      <button 
                        className={styles.quantityButton}
                        onClick={() => handleQuantityChange(item.ticket.ticket_id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    <div className={styles.itemPrice}>
                      {formatPrice(item.ticket.face_value * item.quantity)}
                    </div>
                  </div>
                ))}

                <div className={styles.removeAllContainer}>
                  <button className={styles.removeAllButton} onClick={handleRemoveAll}>
                    🗑️ Remove all
                  </button>
                  <div className={styles.totalQuantity}>
                    {cartItems.reduce((total, item) => total + item.quantity, 0)} X {
                      cartItems.length > 0 
                        ? formatPrice(subtotal / cartItems.reduce((total, item) => total + item.quantity, 0))
                        : formatPrice(0)
                    }
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className={styles.orderSummary}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Subtotal</span>
                  <span className={styles.summaryValue}>{formatPrice(subtotal)}</span>
                </div>
                
                <div className={styles.orderTotalRow}>
                  <span className={styles.orderTotalLabel}>Order Total</span>
                  <span className={styles.orderTotalValue}>{formatPrice(orderTotal)}</span>
                </div>
              </div>

              {/* Phase 1: Step 2 - Guest Requirements Preview */}
              <GuestRequirementsPreview
                requirements={guestRequirements || null}
                ticketQuantity={cartItems.reduce((total, item) => total + item.quantity, 0)}
                isLoading={guestRequirementsLoading || false}
                error={guestRequirementsError || null}
              />

              {/* Checkout Button */}
              <div className={styles.checkoutSection}>
                <button 
                  className={styles.checkoutButton}
                  onClick={onCheckout}
                  disabled={cartItems.length === 0}
                >
                  Continue to checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartPanel;
