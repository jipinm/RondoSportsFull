import React from 'react';
import type { ReactNode } from 'react';
import styles from './Grid.module.css';

type GridColumns = 1 | 2 | 3 | 4 | 5 | 6;
type GridGap = 'small' | 'medium' | 'large';

interface GridProps {
  children: ReactNode;
  className?: string;
  columns?: GridColumns;
  gap?: GridGap;
}

const Grid: React.FC<GridProps> = ({ 
  children, 
  className = '', 
  columns = 3,
  gap = 'medium' 
}) => {
  return (
    <div 
      className={`
        ${styles.grid} 
        ${styles[`columns${columns}`]} 
        ${styles[`gap${gap.charAt(0).toUpperCase() + gap.slice(1)}`]} 
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Grid;
