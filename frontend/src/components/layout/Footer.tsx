import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';
import { FaFacebookF, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { FiPhone, FiMail } from 'react-icons/fi';

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <div className={styles.footerLogo}>
              <img src="/logo-footer.png" alt="RONDO Sports Tickets" className={styles.footerLogoImg} />
            </div>
            
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <FiPhone className={styles.contactIcon} />
                <span>800 000 0000</span>
              </div>
              <div className={styles.contactItem}>
                <FiMail className={styles.contactIcon} />
                <span>info@bascompalmer.com</span>
              </div>
            </div>
            
            <div className={styles.socialIcons}>
              <a href="#" className={styles.socialIcon}>
                <FaFacebookF />
              </a>
              <a href="#" className={styles.socialIcon}>
                <FaInstagram />
              </a>
              <a href="#" className={styles.socialIcon}>
                <FaLinkedinIn />
              </a>
            </div>
          </div>
          
          <div className={styles.footerSection}>
            <div className={styles.linksColumn}>
              <Link to="/" className={styles.footerLink}>Home</Link>
              <Link to="/about-us" className={styles.footerLink}>About Us</Link>
              <Link to="/faq" className={styles.footerLink}>Faq</Link>
              <Link to="/contact-us" className={styles.footerLink}>Contact Us</Link>
            </div>
          </div>
          
          <div className={styles.footerSection}>
            <div className={styles.linksColumn}>
              <Link to="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
              <Link to="/terms-conditions" className={styles.footerLink}>Terms & Conditions</Link>
            </div>
          </div>
          
          <div className={styles.footerSection}>
            <h4 className={styles.newsletterTitle}>Newsletter</h4>
            <p className={styles.newsletterText}>Get early access to tickets, match alerts, and special deals – straight to your inbox.</p>
            <div className={styles.newsletterForm}>
              <input type="email" placeholder="Your Email" className={styles.newsletterInput} />
              <button className={styles.newsletterButton}>Subscribe</button>
            </div>
          </div>
          

        </div>
        
        <div className={styles.copyright}>
          <div className={styles.copyrightContent}>
            <span>© 2025 Rondo Sports Travel. All rights reserved.</span>
            <div className={styles.copyrightLine}></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
