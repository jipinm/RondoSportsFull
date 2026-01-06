import React from 'react';
import styles from './WhyRondoSports.module.css';

interface Feature {
  id: number;
  title: string;
  description: string;
  icon: string;
}

const features: Feature[] = [
  {
    id: 1,
    title: 'Where Live Lives',
    description: 'Get immediate access to tickets for the most anticipated sports events worldwide.',
    icon: '/images/icons/why-rondo-1.png'
  },
  {
    id: 2,
    title: 'Experience the Atmosphere',
    description: 'Secure your seat for a spectacular view and an unforgettable experience.',
    icon: '/images/icons/why-rondo-2.png'
  },
  {
    id: 3,
    title: 'Official Reseller',
    description: 'We work closely with official venues to ensure authentic experiences.',
    icon: '/images/icons/why-rondo-3.png'
  }
];

const WhyRondoSports: React.FC = () => {
  return (
    <section className={styles.whyRondoSports}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Why Rondo Sports?</h2>
        
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <React.Fragment key={feature.id}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <img src={feature.icon} alt={feature.title} className={styles.iconImage} />
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
              {index < features.length - 1 && <div className={styles.separator}></div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyRondoSports;
