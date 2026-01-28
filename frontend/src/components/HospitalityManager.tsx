/**
 * HospitalityManager Component
 * 
 * Component for managing hospitality assignments to tickets in an event
 */

import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, X, Check, AlertCircle, Loader } from 'lucide-react';
import { useHospitalities } from '../hooks/useHospitalities';
import { useEventHospitalities } from '../hooks/useEventHospitalities';
import { batchAssignHospitalities } from '../services/hospitalityService';
import type { Ticket } from '../services/apiRoutes';
import styles from './HospitalityManager.module.css';

interface HospitalityManagerProps {
  eventId: string;
  tickets: Ticket[];
}

const HospitalityManager: React.FC<HospitalityManagerProps> = ({ eventId, tickets }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedHospitalities, setSelectedHospitalities] = useState<Record<string, number[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Check if user is authenticated admin
  const isAdmin = !!localStorage.getItem('adminToken');

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  // Fetch all hospitality services
  const { hospitalities, loading: hospitalitiesLoading } = useHospitalities(true);

  // Fetch existing hospitality assignments for this event
  const { 
    groupedByTicket, 
    loading: assignmentsLoading, 
    refetch: refetchAssignments 
  } = useEventHospitalities(eventId);

  // Initialize selected hospitalities from existing assignments
  useEffect(() => {
    if (groupedByTicket && Object.keys(groupedByTicket).length > 0) {
      const initial: Record<string, number[]> = {};
      Object.entries(groupedByTicket).forEach(([ticketId, assignments]) => {
        initial[ticketId] = assignments.map(a => a.hospitality_id);
      });
      setSelectedHospitalities(initial);
    }
  }, [groupedByTicket]);

  // Toggle hospitality selection for a ticket
  const toggleHospitality = (ticketId: string, hospitalityId: number) => {
    setSelectedHospitalities(prev => {
      const current = prev[ticketId] || [];
      const isSelected = current.includes(hospitalityId);
      
      return {
        ...prev,
        [ticketId]: isSelected 
          ? current.filter(id => id !== hospitalityId)
          : [...current, hospitalityId]
      };
    });
  };

  // Check if a hospitality is selected for a ticket
  const isHospitalitySelected = (ticketId: string, hospitalityId: number): boolean => {
    return (selectedHospitalities[ticketId] || []).includes(hospitalityId);
  };

  // Get total price of selected hospitalities for a ticket
  const getTicketHospitalitiesTotal = (ticketId: string): number => {
    const selected = selectedHospitalities[ticketId] || [];
    return selected.reduce((total, hospId) => {
      const hosp = hospitalities.find(h => h.id === hospId);
      return total + (hosp?.price_usd || 0);
    }, 0);
  };

  // Save all hospitality assignments
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      await batchAssignHospitalities(eventId, selectedHospitalities);

      setSaveSuccess(true);
      await refetchAssignments();

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

    } catch (err: any) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save hospitality assignments');
    } finally {
      setIsSaving(false);
    }
  };

  // Count total assigned hospitalities
  const getTotalAssignedCount = (): number => {
    return Object.values(selectedHospitalities).reduce((total, hospIds) => {
      return total + hospIds.length;
    }, 0);
  };

  if (!isOpen) {
    return (
      <button 
        className={styles.openButton}
        onClick={() => setIsOpen(true)}
        title="Manage Hospitality Services"
      >
        <ChefHat size={20} />
        <span>Manage Hospitality</span>
        {getTotalAssignedCount() > 0 && (
          <span className={styles.badge}>{getTotalAssignedCount()}</span>
        )}
      </button>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <ChefHat size={24} />
            <h2>Hospitality Management</h2>
          </div>
          <button 
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {(hospitalitiesLoading || assignmentsLoading) ? (
            <div className={styles.loading}>
              <Loader className={styles.spinner} size={32} />
              <p>Loading hospitality services...</p>
            </div>
          ) : hospitalities.length === 0 ? (
            <div className={styles.empty}>
              <ChefHat size={48} />
              <h3>No Hospitality Services Available</h3>
              <p>Please create hospitality services first in the admin panel.</p>
            </div>
          ) : (
            <>
              {/* Hospitality Services List */}
              <div className={styles.servicesSection}>
                <h3>Available Hospitality Services</h3>
                <div className={styles.servicesList}>
                  {hospitalities.map(hospitality => (
                    <div key={hospitality.id} className={styles.serviceCard}>
                      <div className={styles.serviceInfo}>
                        <h4>{hospitality.name}</h4>
                        {hospitality.description && (
                          <p className={styles.serviceDescription}>{hospitality.description}</p>
                        )}
                      </div>
                      <div className={styles.servicePrice}>
                        ${hospitality.price_usd.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tickets Assignment Section */}
              <div className={styles.ticketsSection}>
                <h3>Assign to Tickets</h3>
                <div className={styles.ticketsList}>
                  {tickets.map(ticket => (
                    <div key={ticket.ticket_id} className={styles.ticketCard}>
                      <div className={styles.ticketHeader}>
                        <div className={styles.ticketInfo}>
                          <h4>{ticket.ticket_title}</h4>
                          <span className={styles.ticketCategory}>{ticket.category_name}</span>
                        </div>
                        <button
                          className={styles.toggleButton}
                          onClick={() => setSelectedTicket(
                            selectedTicket === ticket.ticket_id ? null : ticket.ticket_id
                          )}
                          aria-label={selectedTicket === ticket.ticket_id ? 'Collapse' : 'Expand'}
                        >
                          {selectedTicket === ticket.ticket_id ? (
                            <X size={16} />
                          ) : (
                            <Plus size={16} />
                          )}
                        </button>
                      </div>

                      {selectedTicket === ticket.ticket_id && (
                        <div className={styles.hospitalitiesSelection}>
                          {hospitalities.map(hospitality => (
                            <label 
                              key={hospitality.id} 
                              className={styles.checkboxLabel}
                            >
                              <input
                                type="checkbox"
                                checked={isHospitalitySelected(ticket.ticket_id, hospitality.id)}
                                onChange={() => toggleHospitality(ticket.ticket_id, hospitality.id)}
                                className={styles.checkbox}
                              />
                              <span className={styles.hospitalityName}>
                                {hospitality.name}
                              </span>
                              <span className={styles.hospitalityPrice}>
                                +${hospitality.price_usd.toFixed(2)}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {(selectedHospitalities[ticket.ticket_id]?.length || 0) > 0 && (
                        <div className={styles.ticketSummary}>
                          <span className={styles.summaryLabel}>
                            {selectedHospitalities[ticket.ticket_id].length} service(s) assigned
                          </span>
                          <span className={styles.summaryTotal}>
                            +${getTicketHospitalitiesTotal(ticket.ticket_id).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {saveSuccess && (
            <div className={styles.successMessage}>
              <Check size={16} />
              <span>Hospitality assignments saved successfully!</span>
            </div>
          )}

          {saveError && (
            <div className={styles.errorMessage}>
              <AlertCircle size={16} />
              <span>{saveError}</span>
            </div>
          )}

          <div className={styles.footerActions}>
            <button 
              className={styles.cancelButton}
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isSaving || hospitalitiesLoading}
            >
              {isSaving ? (
                <>
                  <Loader className={styles.spinner} size={16} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Assignments</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalityManager;
