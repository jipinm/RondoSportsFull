import React, { useState, useEffect } from 'react';
import { X, ChefHat } from 'lucide-react';
import type { Ticket, EventGuestRequirements } from '../services/apiRoutes';
import { calculateMarkupAmount, type TicketMarkup } from '../services/ticketEnhancementsService';
import GuestRequirementsPreview from './GuestRequirementsPreview';
import styles from './CartPanel.module.css';

// Selected hospitality type
interface SelectedHospitality {
  id: number;
  hospitality_id: number;
  name: string;
  price_usd: number;
}

interface CartItem {
  ticket: Ticket;
  quantity: number;
  selectedHospitalities?: SelectedHospitality[];
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
  // Currency conversion props (multi-currency support)
  currencyConversion?: {
    hasConversion: boolean;
    convertAmount: (amount: number, fromCurrency: string) => number;
    getExchangeRate: (currency: string) => number;
    hasConversionForCurrency: (currency: string) => boolean;
  };
  // Markup pricing data
  markupsByTicket?: Map<string, TicketMarkup>;
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
  guestRequirementsError,
  currencyConversion,
  markupsByTicket
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

  // Get the final price for a ticket (with markup applied)
  // Uses live exchange rate for calculating percentage-based markup
  const getTicketFinalPrice = (ticket: Ticket): number => {
    const currency = ticket.currency_code || 'USD';
    const price = ticket.face_value || 0;
    
    // Get markup for this ticket
    const markup = markupsByTicket?.get(ticket.ticket_id);
    
    // If currency conversion is available for this ticket's currency
    if (currencyConversion?.hasConversionForCurrency(currency) && currency !== 'USD') {
      const usdPrice = currencyConversion.convertAmount(price, currency);
      // Calculate markup dynamically using live USD base price
      const markupAmount = calculateMarkupAmount(usdPrice, markup ?? null);
      return usdPrice + markupAmount;
    }
    
    // Already in USD - calculate markup dynamically
    if (currency === 'USD') {
      const markupAmount = calculateMarkupAmount(price, markup ?? null);
      return price + markupAmount;
    }
    
    // No conversion available, no markup calculation possible
    return price;
  };

  // Get hospitality total for a cart item
  const getHospitalityTotal = (item: CartItem): number => {
    if (!item.selectedHospitalities || item.selectedHospitalities.length === 0) {
      return 0;
    }
    return item.selectedHospitalities.reduce((sum, h) => sum + h.price_usd, 0);
  };

  // Get total price for a cart item (ticket + hospitalities) * quantity
  const getItemTotal = (item: CartItem): number => {
    const ticketPrice = getTicketFinalPrice(item.ticket);
    const hospitalityTotal = getHospitalityTotal(item);
    return (ticketPrice + hospitalityTotal) * item.quantity;
  };

  // Calculate subtotal using final prices with markup and hospitalities
  const subtotal = cartItems.reduce((total, item) => {
    return total + getItemTotal(item);
  }, 0);

  // Order total is just the subtotal (no additional booking costs)
  const orderTotal = subtotal;

  const formatPrice = (amount: number) => {
    // Use USD if conversion is available
    if (currencyConversion?.hasConversion) {
      return `USD ${amount.toFixed(2)}`;
    }
    
    const currency = cartItems[0]?.ticket.currency_code || 'USD';
    return `${currency} ${amount.toFixed(2)}`;
  };

  // Format price for a specific ticket item (with markup and hospitalities)
  const formatItemPrice = (item: CartItem) => {
    const finalPrice = getItemTotal(item);
    return formatPrice(finalPrice);
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
                      
                      {/* Display selected hospitalities */}
                      {item.selectedHospitalities && item.selectedHospitalities.length > 0 && (
                        <div className={styles.hospitalityList}>
                          {item.selectedHospitalities.map(h => (
                            <div key={h.hospitality_id} className={styles.hospitalityItem}>
                              <ChefHat size={12} />
                              <span>{h.name}</span>
                              <span className={styles.hospitalityPrice}>+${h.price_usd.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
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
                      {formatItemPrice(item)}
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
