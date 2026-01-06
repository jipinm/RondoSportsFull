import React from 'react';
import { useParams } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import styles from './TicketsPage.module.css';

const TicketsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { tickets, loading, error } = useTickets({ event_id: eventId });

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
                <h3>{ticket.name}</h3>
                <p>Type: {ticket.type}</p>
                {ticket.price_min && <p>Price: ${ticket.price_min}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
