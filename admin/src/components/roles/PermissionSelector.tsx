import React, { useState, useMemo } from 'react';
import type { Permission } from '../../types/roles';
import styles from './PermissionSelector.module.css';

interface PermissionSelectorProps {
  permissions: Permission[];
  selectedPermissions: number[];
  onChange: (selectedIds: number[]) => void;
  disabled?: boolean;
  error?: string;
}

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  permissions,
  selectedPermissions,
  onChange,
  disabled = false,
  error
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group permissions by category
  const permissionGroups = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    
    permissions.forEach(permission => {
      const category = permission.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
    });

    // Sort permissions within each category
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [permissions]);

  // Filter permissions based on search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return permissionGroups;

    const filtered: Record<string, Permission[]> = {};
    
    Object.entries(permissionGroups).forEach(([category, perms]) => {
      const filteredPerms = perms.filter(perm => 
        perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (perm.description && perm.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        perm.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (filteredPerms.length > 0) {
        filtered[category] = filteredPerms;
      }
    });

    return filtered;
  }, [permissionGroups, searchTerm]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePermission = (permissionId: number) => {
    if (disabled) return;

    const newSelected = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(id => id !== permissionId)
      : [...selectedPermissions, permissionId];
    
    onChange(newSelected);
  };

  const toggleAllInCategory = (categoryPerms: Permission[]) => {
    if (disabled) return;

    const categoryIds = categoryPerms.map(p => p.id);
    const allSelected = categoryIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      // Deselect all in category
      const newSelected = selectedPermissions.filter(id => !categoryIds.includes(id));
      onChange(newSelected);
    } else {
      // Select all in category
      const newSelected = [...new Set([...selectedPermissions, ...categoryIds])];
      onChange(newSelected);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(permissions.map(p => p.id));
  };

  const selectNone = () => {
    if (disabled) return;
    onChange([]);
  };

  const getCategoryStats = (categoryPerms: Permission[]) => {
    const categoryIds = categoryPerms.map(p => p.id);
    const selectedCount = categoryIds.filter(id => selectedPermissions.includes(id)).length;
    return { selected: selectedCount, total: categoryIds.length };
  };

  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Auto-expand categories when searching
  React.useEffect(() => {
    if (searchTerm) {
      setExpandedCategories(new Set(Object.keys(filteredGroups)));
    }
  }, [searchTerm, filteredGroups]);

  return (
    <div className={`${styles.permissionSelector} ${error ? styles.hasError : ''}`}>
      {/* Search and Controls */}
      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            disabled={disabled}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>
        
        <div className={styles.bulkActions}>
          <button
            type="button"
            onClick={selectAll}
            className={styles.bulkButton}
            disabled={disabled}
          >
            Select All
          </button>
          <button
            type="button"
            onClick={selectNone}
            className={styles.bulkButton}
            disabled={disabled}
          >
            Select None
          </button>
        </div>
      </div>

      {/* Selection Summary */}
      <div className={styles.summary}>
        <span className={styles.summaryText}>
          {selectedPermissions.length} of {permissions.length} permissions selected
        </span>
      </div>

      {/* Permission Groups */}
      <div className={styles.permissionGroups}>
        {Object.entries(filteredGroups).map(([category, categoryPerms]) => {
          const stats = getCategoryStats(categoryPerms);
          const isExpanded = expandedCategories.has(category);
          const allSelected = stats.selected === stats.total && stats.total > 0;
          const someSelected = stats.selected > 0 && stats.selected < stats.total;

          return (
            <div key={category} className={styles.permissionGroup}>
              <div 
                className={styles.categoryHeader}
                onClick={() => toggleCategory(category)}
              >
                <div className={styles.categoryLeft}>
                  <span className={styles.expandIcon}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={() => toggleAllInCategory(categoryPerms)}
                    className={styles.categoryCheckbox}
                    disabled={disabled}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className={styles.categoryName}>
                    {formatCategoryName(category)}
                  </span>
                </div>
                <span className={styles.categoryStats}>
                  {stats.selected}/{stats.total}
                </span>
              </div>

              {isExpanded && (
                <div className={styles.permissionList}>
                  {categoryPerms.map(permission => (
                    <div 
                      key={permission.id} 
                      className={`${styles.permissionItem} ${disabled ? styles.disabled : ''}`}
                      onClick={() => togglePermission(permission.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className={styles.permissionCheckbox}
                        disabled={disabled}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={styles.permissionDetails}>
                        <div className={styles.permissionName}>
                          {permission.display_name}
                        </div>
                        <div className={styles.permissionMeta}>
                          <span className={styles.permissionCategory}>
                            {permission.category}
                          </span>
                          <span className={styles.permissionSystemBadge}>
                            {permission.is_system ? 'System' : 'Custom'}
                          </span>
                        </div>
                        {permission.description && (
                          <div className={styles.permissionDescription}>
                            {permission.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.keys(filteredGroups).length === 0 && (
        <div className={styles.emptyState}>
          {searchTerm ? 'No permissions match your search.' : 'No permissions available.'}
        </div>
      )}
    </div>
  );
};