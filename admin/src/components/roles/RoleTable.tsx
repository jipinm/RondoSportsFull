import React, { useState, useMemo } from 'react';
import type {
  Role,
  RoleTableColumn,
  RoleTableSort,
  RoleTableFilters
} from '../../types/roles';
import styles from './RoleTable.module.css';

interface RoleTableProps {
  roles: Role[];
  loading: boolean;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onBulkAction: (action: string, roleIds: number[]) => void;
  currentUserPermissions: string[];
  isSuperAdmin?: boolean;
}

export const RoleTable: React.FC<RoleTableProps> = ({
  roles,
  loading,
  onEdit,
  onDelete,
  onBulkAction,
  currentUserPermissions,
  isSuperAdmin = false
}) => {
  const [sort, setSort] = useState<RoleTableSort>({ column: 'name', direction: 'asc' });
  const [filters, setFilters] = useState<RoleTableFilters>({
    search: '',
    isSystem: 'all'
  });
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const columns: RoleTableColumn[] = [
    { key: 'name', label: 'Role Name', sortable: true, width: '30%' },
    { key: 'description', label: 'Description', sortable: false, width: '45%' },
    { key: 'user_count', label: 'Users', sortable: true, width: '10%' },
    { key: 'actions', label: 'Actions', sortable: false, width: '15%' }
  ];

  // Filter and sort roles
  const filteredAndSortedRoles = useMemo(() => {
    let filtered = roles.filter(role => {
      const matchesSearch = !filters.search || 
        role.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        role.description.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesType = filters.isSystem === 'all' ||
        (filters.isSystem === 'system' && role.is_system) ||
        (filters.isSystem === 'custom' && !role.is_system);

      return matchesSearch && matchesType;
    });

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sort.column];
      const bValue = b[sort.column];
      
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [roles, filters, sort]);

  const handleSort = (column: keyof Role) => {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectRole = (roleId: number) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId);
    } else {
      newSelected.add(roleId);
    }
    setSelectedRoles(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedRoles.size === filteredAndSortedRoles.length) {
      setSelectedRoles(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(filteredAndSortedRoles.map(role => role.id));
      setSelectedRoles(allIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedRoles.size > 0) {
      onBulkAction(action, Array.from(selectedRoles));
      setSelectedRoles(new Set());
      setShowBulkActions(false);
    }
  };

  const canEditRole = (_role: Role) => {
    // Allow editing for super admin or users with role.update permission
    return isSuperAdmin || currentUserPermissions.includes('role.update');
  };

  const canDeleteRole = (_role: Role) => {
    // Allow deleting for super admin or users with role.delete permission
    return isSuperAdmin || currentUserPermissions.includes('role.delete');
  };

  const getRoleTypeBadge = (isSystem: boolean) => (
    <span className={`${styles.typeBadge} ${isSystem ? styles.system : styles.custom}`}>
      {isSystem ? 'System' : 'Custom'}
    </span>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading roles...</p>
      </div>
    );
  }

  return (
    <div className={styles.roleTableContainer}>
      {/* Filters */}
      <div className={styles.filtersContainer}>
        <div className={styles.filterGroup}>
          <input
            type="text"
            placeholder="Search roles..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <select
            value={filters.isSystem}
            onChange={(e) => setFilters(prev => ({ ...prev, isSystem: e.target.value as any }))}
            className={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="system">System Roles</option>
            <option value="custom">Custom Roles</option>
          </select>
        </div>

        <div className={styles.resultsCount}>
          {filteredAndSortedRoles.length} of {roles.length} roles
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className={styles.bulkActionsBar}>
          <span>{selectedRoles.size} role(s) selected</span>
          <div className={styles.bulkActions}>
            <button 
              onClick={() => handleBulkAction('activate')}
              className={styles.bulkActionBtn}
            >
              Activate
            </button>
            <button 
              onClick={() => handleBulkAction('deactivate')}
              className={styles.bulkActionBtn}
            >
              Deactivate
            </button>
            <button 
              onClick={() => handleBulkAction('delete')}
              className={`${styles.bulkActionBtn} ${styles.danger}`}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.roleTable}>
          <thead>
            <tr>
              <th className={styles.checkboxColumn}>
                <input
                  type="checkbox"
                  checked={filteredAndSortedRoles.length > 0 && selectedRoles.size === filteredAndSortedRoles.length}
                  onChange={handleSelectAll}
                />
              </th>
              {columns.map(column => (
                <th 
                  key={column.key}
                  style={{ width: column.width }}
                  className={column.sortable ? styles.sortableColumn : ''}
                  onClick={column.sortable ? () => handleSort(column.key as keyof Role) : undefined}
                >
                  <div className={styles.columnHeader}>
                    {column.label}
                    {column.sortable && (
                      <span className={styles.sortIcon}>
                        {sort.column === column.key ? 
                          (sort.direction === 'asc' ? '↑' : '↓') : '↕'
                        }
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRoles.map(role => (
              <tr key={role.id} className={styles.roleRow}>
                <td className={styles.checkboxColumn}>
                  <input
                    type="checkbox"
                    checked={selectedRoles.has(role.id)}
                    onChange={() => handleSelectRole(role.id)}
                  />
                </td>
                <td>
                  <div className={styles.roleNameCell}>
                    <span className={styles.roleName}>{role.name}</span>
                    {getRoleTypeBadge(role.is_system)}
                  </div>
                </td>
                <td>
                  <div className={styles.description} title={role.description}>
                    {role.description}
                  </div>
                </td>
                <td>
                  <span className={styles.userCount}>
                    {role.user_count || 0}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {canEditRole(role) && (
                      <button
                        onClick={() => onEdit(role)}
                        className={styles.actionBtn}
                        title="Edit Role"
                      >
                        ✏️
                      </button>
                    )}
                    {canDeleteRole(role) && (
                      <button
                        onClick={() => onDelete(role)}
                        className={`${styles.actionBtn} ${styles.danger}`}
                        title="Delete Role"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedRoles.length === 0 && (
        <div className={styles.emptyState}>
          <p>No roles found matching your filters.</p>
        </div>
      )}
    </div>
  );
};