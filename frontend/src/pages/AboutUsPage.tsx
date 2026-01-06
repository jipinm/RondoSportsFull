import React from 'react';
import { Link } from 'react-router-dom';
import { MdArrowRight, MdSports, MdVerified, MdPeople, MdTravelExplore } from 'react-icons/md';
import { FaGlobe, FaAward, FaHandshake, FaStar } from 'react-icons/fa';
import styles from './AboutUsPage.module.css';

interface TeamMember {
  id: number;
  name: string;
  position: string;
  image: string;
  description: string;
}

interface Stat {
  number: string;
  label: string;
  icon: React.ReactNode;
}

const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: 'James Richardson',
    position: 'CEO & Founder',
    image: '/images/team/james.jpg',
    description: 'With over 15 years in sports entertainment, James founded Rondo Sports to revolutionize the ticket booking experience.'
  },
  {
    id: 2,
    name: 'Sara Johnson',
    position: 'Head of Operations',
    image: '/images/team/sara.jpg',
    description: 'Sara ensures seamless operations and exceptional customer service across all our sports events and venues.'
  },
  {
    id: 3,
    name: 'Michael Chen',
    position: 'Technology Director',
    image: '/images/team/michael.png',
    description: 'Michael leads our technical innovation, building the platform that connects sports fans with unforgettable experiences.'
  }
];

const stats: Stat[] = [
  {
    number: '500K+',
    label: 'Happy Customers',
    icon: <MdPeople />
  },
  {
    number: '50+',
    label: 'Sports Categories',
    icon: <MdSports />
  },
  {
    number: '1000+',
    label: 'Events Monthly',
    icon: <FaGlobe />
  },
  {
    number: '99%',
    label: 'Customer Satisfaction',
    icon: <FaStar />
  }
];

const AboutUsPage: React.FC = () => {
  return (
    <div className={styles.aboutUsPage}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <div className={styles.heroLeft}>
              <h1 className={styles.heroTitle}>
                Where Live Lives
                <span className={styles.titleHighlight}>Sports</span>
              </h1>
              <p className={styles.heroDescription}>
                At Rondo Sports, we're passionate about connecting sports fans with the most thrilling live experiences. 
                From Premier League football to Formula 1 racing, we make accessing your favorite sports events effortless and memorable.
              </p>
              <div className={styles.heroButtons}>
                <Link to="/events" className={styles.primaryButton}>
                  Browse Events
                  <MdArrowRight />
                </Link>
                <Link to="/faq" className={styles.secondaryButton}>
                  Learn More
                </Link>
              </div>
            </div>
            <div className={styles.heroRight}>
              <div className={styles.heroImageContainer}>
                <img 
                  src="/images/events/premier-league-hero.jpg" 
                  alt="Sports Stadium" 
                  className={styles.heroImage}
                />
                <div className={styles.heroImageOverlay}>
                  <div className={styles.overlayContent}>
                    <MdVerified className={styles.overlayIcon} />
                    <span>Official Reseller</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.statItem}>
                <div className={styles.statIcon}>
                  {stat.icon}
                </div>
                <div className={styles.statNumber}>{stat.number}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className={styles.valuesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Our Values</h2>
            <p className={styles.sectionSubtitle}>
              The principles that guide everything we do
            </p>
          </div>
          
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <FaAward />
              </div>
              <h3 className={styles.valueTitle}>Excellence</h3>
              <p className={styles.valueDescription}>
                We strive for excellence in every aspect of our service, from ticket authenticity to customer support.
              </p>
            </div>
            
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <FaHandshake />
              </div>
              <h3 className={styles.valueTitle}>Trust</h3>
              <p className={styles.valueDescription}>
                Building lasting relationships through transparency, reliability, and consistent delivery of promises.
              </p>
            </div>
            
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <MdTravelExplore />
              </div>
              <h3 className={styles.valueTitle}>Innovation</h3>
              <p className={styles.valueDescription}>
                Continuously innovating to provide the most intuitive and efficient sports ticket booking experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className={styles.teamSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Meet Our Team</h2>
            <p className={styles.sectionSubtitle}>
              The passionate individuals behind Rondo Sports
            </p>
          </div>
          
          <div className={styles.teamGrid}>
            {teamMembers.map((member) => (
              <div key={member.id} className={styles.teamCard}>
                <div className={styles.teamImageContainer}>
                  <img src={member.image} alt={member.name} className={styles.teamImage} />
                </div>
                <div className={styles.teamInfo}>
                  <h3 className={styles.teamName}>{member.name}</h3>
                  <p className={styles.teamPosition}>{member.position}</p>
                  <p className={styles.teamDescription}>{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUsPage;
