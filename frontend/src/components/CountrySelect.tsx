import React, { useState, useEffect, useRef } from 'react';
import countryService from '../services/countryService';
import type { Country } from '../services/countryService';
import styles from './CountrySelect.module.css';

interface CountrySelectProps {
  value?: string;
  onChange: (countryCode: string, countryName: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

const CountrySelect: React.FC<CountrySelectProps> = ({
  value = '',
  onChange,
  placeholder = 'Select a country...',
  className = '',
  disabled = false,
  error
}) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); // Always initialize as empty string
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const countryList = await countryService.getAllCountries();
        setCountries(countryList);
        setFilteredCountries(countryList);
        
        // Set initial selected country if value is provided
        if (value) {
          const selected = countryList.find(country => country.country_code === value);
          if (selected) {
            setSelectedCountry(selected);
            setSearchTerm(selected.country_name || ''); // Ensure string value
          }
        }
      } catch (err: any) {
        console.error('Failed to load countries:', err);
        setLoadError(err.message || 'Failed to load countries');
      } finally {
        setLoading(false);
      }
    };

    loadCountries();
  }, [value]);

  // Filter countries based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter(country =>
        country.country_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  }, [searchTerm, countries]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Restore selected country name if user didn't select anything
        if (selectedCountry) {
          setSearchTerm(selectedCountry.country_name || ''); // Ensure string value
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedCountry]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setSearchTerm(country.country_name);
    setIsOpen(false);
    onChange(country.country_code, country.country_name);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      if (selectedCountry) {
        setSearchTerm(selectedCountry.country_name || ''); // Ensure string value
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCountries.length === 1) {
        handleCountrySelect(filteredCountries[0]);
      }
    }
  };

  if (loading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <input
          type="text"
          placeholder="Loading countries..."
          disabled
          className={styles.input}
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${styles.container} ${className}`}>
        <input
          type="text"
          placeholder="Failed to load countries"
          disabled
          className={`${styles.input} ${styles.error}`}
        />
        <div className={styles.errorMessage}>{loadError}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`} ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm || ''} // Ensure always a string
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        disabled={disabled}
        autoComplete="country"
      />
      
      {isOpen && (
        <div className={styles.dropdown}>
          {filteredCountries.length > 0 ? (
            <div className={styles.optionsList}>
              {filteredCountries.map((country) => (
                <div
                  key={country.country_code}
                  className={`${styles.option} ${
                    selectedCountry?.country_code === country.country_code ? styles.selected : ''
                  }`}
                  onClick={() => handleCountrySelect(country)}
                >
                  <span className={styles.countryName}>{country.country_name}</span>
                  <span className={styles.countryCode}>({country.country_code})</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              No countries found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}
      
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default CountrySelect;