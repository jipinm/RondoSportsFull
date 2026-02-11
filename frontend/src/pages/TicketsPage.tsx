import React from 'react';
import { useParams } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { useMultiCurrencyConversion } from '../hooks/useMultiCurrencyConversion';
import { useSelectedCurrency } from '../contexts/CurrencyContext';
import styles from './TicketsPage.module.css';

const TicketsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { tickets, loading, error } = useTickets({ event_id: eventId });
  
  // Get user-selected currency
  const { selectedCurrencyCode } = useSelectedCurrency();
  
  // Get unique currencies from tickets for conversion
  const currencies = React.useMemo(() => {
    const uniqueCurrencies = [...new Set(tickets.map(t => t.currency_code).filter(Boolean))];
    return uniqueCurrencies;
  }, [tickets]);
  
  // Currency conversion hook - convert ticket prices to selected currency
  const { convertAmount, isLoading: currencyLoading } = useMultiCurrencyConversion(currencies, selectedCurrencyCode);

  // Format price to selected currency
  const formatPriceToSelected = (price: number, currencyCode: string) => {
    if (!price || price === 0) return '';
    const converted = convertAmount(price, currencyCode);
    return `${selectedCurrencyCode} ${converted.toFixed(2)}`;
  };

  return (
    <div className={styles.ticketsPage}>
      <div className={styles.container}>
        <h1>Tickets</h1>
        {eventId && <p>Event ID: {eventId}</p>}
        {loading && <p>Loading tickets...</p>}
        {error && <p>Error: {error}</p>}
        {!loading && !error && (
          <div>
            <p>{tickets.length} ticket categories found</p>
            {tickets.map((ticket: any) => (
              <div key={ticket.category_id} style={{ margin: '10px 0', padding: '10px', border: '1px solid #333' }}>
                <h3>{ticket.name || ticket.ticket_title}</h3>
                <p>Type: {ticket.type || ticket.type_ticket}</p>
                {ticket.net_rate && ticket.net_rate > 0 && (
                  currencyLoading ? (
                    <p className={styles.skeletonPrice}>Loading price...</p>
                  ) : (
                    <p>Price: {formatPriceToSelected(ticket.net_rate, ticket.currency_code)}</p>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
