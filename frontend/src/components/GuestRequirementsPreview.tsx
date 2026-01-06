import React from 'react';
import { Info, User, Mail, Calendar, MapPin, IdCard } from 'lucide-react';
import type { EventGuestRequirements } from '../services/apiRoutes';
import styles from './GuestRequirementsPreview.module.css';

interface GuestRequirementsPreviewProps {
  requirements: EventGuestRequirements | null;
  ticketQuantity: number;
  isLoading?: boolean;
  error?: string | null;
}

const GuestRequirementsPreview: React.FC<GuestRequirementsPreviewProps> = ({
  requirements,
  ticketQuantity,
  isLoading = false,
  error
}) => {
  if (isLoading) {
    return (
      <div className={styles.previewContainer}>
        <div className={styles.previewHeader}>
          <Info size={16} />
          <span>Checking guest requirements...</span>
        </div>
      </div>
    );
  }

  if (error && !requirements) {
    return (
      <div className={styles.previewContainer}>
        <div className={styles.previewHeader}>
          <Info size={16} />
          <span>Guest information will be required</span>
        </div>
        <p className={styles.fallbackMessage}>
          You'll need to provide guest details during checkout.
        </p>
      </div>
    );
  }

  if (!requirements || !requirements.requirements || !requirements.requirements.length) {
    return null;
  }

  const getFieldIcon = (fieldName: string) => {
    switch (fieldName) {
      case 'first_name':
      case 'last_name':
        return <User size={14} />;
      case 'contact_email':
        return <Mail size={14} />;
      case 'date_of_birth':
        return <Calendar size={14} />;
      case 'country_of_residence':
      case 'street_name':
      case 'city':
      case 'zip':
        return <MapPin size={14} />;
      case 'passport_number':
        return <IdCard size={14} />;
      default:
        return <User size={14} />;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    const labels: Record<string, string> = {
      first_name: 'First Name',
      last_name: 'Last Name',
      contact_email: 'Email Address',
      contact_phone: 'Phone Number',
      date_of_birth: 'Date of Birth',
      gender: 'Gender',
      country_of_residence: 'Country',
      passport_number: 'Passport Number',
      street_name: 'Address',
      city: 'City',
      zip: 'Postal Code'
    };
    return labels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Separate requirements by condition and scope
  const preCheckoutRequirements = requirements.requirements.filter(req => 
    req.condition === 'pre_checkout' || !req.condition
  );
  
  const leadGuestFields = preCheckoutRequirements.filter(req => 
    req.scope === 'lead_guest' || (!req.scope && req.field === 'contact_email')
  );
  
  const allGuestFields = preCheckoutRequirements.filter(req => 
    req.scope === 'all_persons' || (!req.scope && req.field !== 'contact_email')
  );

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewHeader}>
        <Info size={16} />
        <span>Guest Information Required</span>
      </div>
      
      <div className={styles.requirementsSummary}>
        <p className={styles.summaryText}>
          You'll need to provide guest details during checkout.
        </p>
      </div>

      {leadGuestFields.length > 0 && (
        <div className={styles.requirementSection}>
          <h4 className={styles.sectionTitle}>For main guest:</h4>
          <div className={styles.fieldsList}>
            {leadGuestFields.map((req, index) => (
              <div key={index} className={styles.fieldItem}>
                {getFieldIcon(req.field)}
                <span className={styles.fieldName}>
                  {getFieldLabel(req.field)}
                  {req.required && <span className={styles.required}> *</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allGuestFields.length > 0 && (
        <div className={styles.requirementSection}>
          <h4 className={styles.sectionTitle}>
            For each guest ({ticketQuantity} {ticketQuantity === 1 ? 'ticket' : 'tickets'}):
          </h4>
          <div className={styles.fieldsList}>
            {allGuestFields.map((req, index) => (
              <div key={index} className={styles.fieldItem}>
                {getFieldIcon(req.field)}
                <span className={styles.fieldName}>
                  {getFieldLabel(req.field)}
                  {req.required && <span className={styles.required}> *</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.previewFooter}>
        <span className={styles.footerNote}>
          * Required fields must be completed before checkout
        </span>
      </div>
    </div>
  );
};

export default GuestRequirementsPreview;