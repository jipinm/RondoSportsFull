import React from 'react';
import Hero from './Hero';
import UpcomingEvents from './UpcomingEvents';
import WhyRondoSports from './WhyRondoSports';

const HomePage: React.FC = () => {
  return (
    <>
      <div style={{ position: 'relative' }}>
        <Hero />
      </div>
      <UpcomingEvents />
      <WhyRondoSports />
    </>
  );
};

export default HomePage;
