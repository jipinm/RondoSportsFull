import React from 'react';
import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import PartnersSection from '../home/PartnersSection';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Header />
      <main>{children}</main>
      <PartnersSection />
      <Footer />
      <div 
        onClick={() => {
          const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '1234567890';
          window.open(`https://wa.me/${whatsappNumber}`, '_blank');
        }}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer',
          zIndex: 999
        }}
      >
        <img 
          src="/images/icons/whatsapp-chat.png" 
          alt="Chat on WhatsApp" 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
    </>
  );
};

export default Layout;
