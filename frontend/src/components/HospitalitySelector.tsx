/**
 * HospitalitySelector Component
 * 
 * Customer-facing component for selecting hospitality services when adding a ticket to cart
 */

import React, { useState } from 'react';
import { ChefHat, Check, X, Info } from 'lucide-react';
import type { HospitalityOption } from '../hooks/usePublicEventHospitalities';
import styles from './HospitalitySelector.module.css';

export interface SelectedHospitality {
  id: number;
  hospitality_id: number;
  name: string;
  price_usd: number;
}

interface HospitalitySelectorProps {
  ticketTitle: string;
  hospitalities: HospitalityOption[];
  onConfirm: (selectedHospitalities: SelectedHospitality[]) => void;
  onCancel: () => void;
}

const HospitalitySelector: React.FC<HospitalitySelectorProps> = ({
  ticketTitle,
  hospitalities,
  onConfirm,
  onCancel
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Toggle hospitality selection
  const toggleHospitality = (hospitalityId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hospitalityId)) {
        newSet.delete(hospitalityId);
      } else {
        newSet.add(hospitalityId);
      }
      return newSet;
    });
  };

  // Calculate total hospitality price
  const getTotalPrice = (): number => {
    return hospitalities
      .filter(h => selectedIds.has(h.hospitality_id))
      .reduce((sum, h) => sum + parseFloat(String(h.effective_price_usd)), 0);
  };

  // Handle confirm
  const handleConfirm = () => {
    const selected = hospitalities
      .filter(h => selectedIds.has(h.hospitality_id))
      .map(h => ({
        id: h.id,
        hospitality_id: h.hospitality_id,
        name: h.name,
        price_usd: parseFloat(String(h.effective_price_usd))
      }));
    onConfirm(selected);
  };

  // Handle skip (add without hospitalities)
  const handleSkip = () => {
    onConfirm([]);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <ChefHat size={24} />
          </div>
          <div className={styles.headerText}>
            <h2>Add Hospitality Services</h2>
            <p className={styles.ticketName}>{ticketTitle}</p>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.infoBox}>
            <Info size={16} />
            <span>Enhance your experience with optional hospitality services</span>
          </div>

          <div className={styles.hospitalitiesList}>
            {hospitalities.map(hospitality => (
              <div 
                key={hospitality.hospitality_id} 
                className={`${styles.hospitalityCard} ${selectedIds.has(hospitality.hospitality_id) ? styles.selected : ''}`}
                onClick={() => toggleHospitality(hospitality.hospitality_id)}
              >
                <div className={styles.checkbox}>
                  {selectedIds.has(hospitality.hospitality_id) && <Check size={14} />}
                </div>
                <div className={styles.hospitalityInfo}>
                  <h4>{hospitality.name}</h4>
                  {hospitality.description && (
                    <p className={styles.description}>{hospitality.description}</p>
                  )}
                </div>
                <div className={styles.hospitalityPrice}>
                  +${parseFloat(String(hospitality.effective_price_usd)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <div className={styles.totalSection}>
              <span>Total Hospitality:</span>
              <span className={styles.totalAmount}>+${getTotalPrice().toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button 
            className={styles.skipButton}
            onClick={handleSkip}
          >
            Skip
          </button>
          <button 
            className={styles.confirmButton}
            onClick={handleConfirm}
          >
            {selectedIds.size > 0 ? (
              <>Add with Hospitality (+${getTotalPrice().toFixed(2)})</>
            ) : (
              <>Add to Cart</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HospitalitySelector;
