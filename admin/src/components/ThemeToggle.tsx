import React from 'react';
import { Sun } from 'lucide-react';
import styles from './ThemeToggle.module.css';

const ThemeToggle: React.FC = () => {
  // Since we're in light-mode only, we'll just make this a visual element without functionality
  return (
    <button 
      className={styles.themeToggle} 
      aria-label="Light mode enabled"
      disabled={true}
    >
      <Sun size={18} className={styles.icon} />
    </button>
  );
};

export default ThemeToggle;
