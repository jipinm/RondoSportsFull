import React, { useState } from 'react';
import { MdEmail, MdPhone, MdLocationOn, MdAccessTime } from 'react-icons/md';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import styles from './ContactUsPage.module.css';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactUsPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
    alert('Message sent successfully! We will get back to you soon.');
  };

  return (
    <div className={styles.contactPage}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Get In
              <span className={styles.titleHighlight}>Touch</span>
            </h1>
            <p className={styles.heroDescription}>
              Have questions about our services or need assistance with your booking? 
              We're here to help you create unforgettable sports experiences.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className={styles.contactInfoSection}>
        <div className={styles.container}>
          <div className={styles.contactGrid}>
            <div className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <MdPhone />
              </div>
              <h3 className={styles.contactCardTitle}>Phone Support</h3>
              <p className={styles.contactCardText}>+44 800 000 0000</p>
              <p className={styles.contactCardSubtext}>Mon-Fri, 9AM-6PM GMT</p>
            </div>

            <div className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <MdEmail />
              </div>
              <h3 className={styles.contactCardTitle}>Email Support</h3>
              <p className={styles.contactCardText}>info@rondosports.com</p>
              <p className={styles.contactCardSubtext}>Response within 24 hours</p>
            </div>

            <div className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <MdLocationOn />
              </div>
              <h3 className={styles.contactCardTitle}>Office Location</h3>
              <p className={styles.contactCardText}>123 Sports Avenue</p>
              <p className={styles.contactCardSubtext}>London, UK SW1A 1AA</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form & Social Media Section */}
      <section className={styles.formSection}>
        <div className={styles.container}>
          <div className={styles.formGrid}>
            {/* Contact Form */}
            <div className={styles.formContainer}>
              <h2 className={styles.formTitle}>Send us a Message</h2>
              <p className={styles.formDescription}>
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
              
              <form onSubmit={handleSubmit} className={styles.contactForm}>
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
                  />
                </div>
                
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
                
                <textarea
                  name="message"
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows={6}
                  required
                ></textarea>
                
                <button type="submit" className={styles.submitButton}>
                  Send Message
                </button>
              </form>
            </div>

            {/* Social Media */}
            <div className={styles.socialContainer}>
              <h2 className={styles.socialTitle}>Follow Us</h2>
              <p className={styles.socialDescription}>
                Stay connected with us on social media for the latest sports updates and exclusive offers.
              </p>
              
              <div className={styles.socialLinks}>
                <a href="#" className={styles.socialLink}>
                  <FaFacebook />
                  <span>Facebook</span>
                </a>
                <a href="#" className={styles.socialLink}>
                  <FaTwitter />
                  <span>Twitter</span>
                </a>
                <a href="#" className={styles.socialLink}>
                  <FaInstagram />
                  <span>Instagram</span>
                </a>
                <a href="#" className={styles.socialLink}>
                  <FaLinkedin />
                  <span>LinkedIn</span>
                </a>
                <a href="#" className={styles.socialLink}>
                  <FaYoutube />
                  <span>YouTube</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className={styles.mapSection}>
        <div className={styles.container}>
          <div className={styles.mapContent}>
            <div className={styles.mapInfo}>
              <h2 className={styles.mapTitle}>Visit Our Office</h2>
              <p className={styles.mapDescription}>
                Located in the heart of London, our office is easily accessible by public transport. 
                Feel free to visit us during business hours or schedule an appointment.
              </p>
              
              <div className={styles.mapDetails}>
                <div className={styles.mapDetail}>
                  <MdLocationOn className={styles.mapDetailIcon} />
                  <div>
                    <h4>Address</h4>
                    <p>123 Sports Avenue, London, UK SW1A 1AA</p>
                  </div>
                </div>
                
                <div className={styles.mapDetail}>
                  <MdAccessTime className={styles.mapDetailIcon} />
                  <div>
                    <h4>Office Hours</h4>
                    <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p>Weekend: 10:00 AM - 4:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.mapContainer}>
              <div className={styles.mapPlaceholder}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2483.540799031448!2d-0.12776908422963236!3d51.50330577963595!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487604b900d26973%3A0x4291f3172409ea92!2sLondon%20SW1A%201AA%2C%20UK!5e0!3m2!1sen!2sus!4v1640995200000!5m2!1sen!2sus"
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Rondo Sports Office Location"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactUsPage;
