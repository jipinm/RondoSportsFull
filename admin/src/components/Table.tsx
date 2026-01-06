import React from 'react';
import type { ReactNode } from 'react';
import styles from './Table.module.css';

interface TableProps {
  children: ReactNode;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
}

interface TableContextType {
  striped?: boolean;
  hoverable?: boolean;
}

interface TableComponent extends React.FC<TableProps> {
  Head: React.FC<{ children: ReactNode; className?: string }>;
  Body: React.FC<{ children: ReactNode; className?: string }>;
  Row: React.FC<{ children: ReactNode; className?: string; isHeader?: boolean }>;
  Cell: React.FC<{ children: ReactNode; className?: string }>;
  HeaderCell: React.FC<{ 
    children: ReactNode; 
    className?: string;
    sortable?: boolean;
    sorted?: 'asc' | 'desc' | null;
    onSort?: () => void;
  }>;
}

const TableContext = React.createContext<TableContextType>({});

const Table = (({ 
  children, 
  className = '',
  striped = true,
  hoverable = true,
}) => {
  return (
    <TableContext.Provider value={{ striped, hoverable }}>
      <div className={`${styles.tableWrapper} ${className}`}>
        <table className={`${styles.table} ${striped ? styles.striped : ''} ${hoverable ? styles.hoverable : ''}`}>
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
}) as TableComponent;

// Table components
const TableHead: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <thead className={`${styles.tableHead} ${className}`}>{children}</thead>
);

const TableBody: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <tbody className={`${styles.tableBody} ${className}`}>{children}</tbody>
);

const TableRow: React.FC<{ children: ReactNode; className?: string; isHeader?: boolean }> = ({ 
  children, 
  className = '',
  isHeader = false
}) => (
  <tr className={`${styles.tableRow} ${isHeader ? styles.headerRow : ''} ${className}`}>{children}</tr>
);

const TableCell: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <td className={`${styles.tableCell} ${className}`}>{children}</td>
);

const TableHeaderCell: React.FC<{ 
  children: ReactNode; 
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onSort?: () => void;
}> = ({ 
  children, 
  className = '',
  sortable,
  sorted,
  onSort
}) => (
  <th 
    className={`${styles.tableHeaderCell} ${sortable ? styles.sortable : ''} ${className}`}
    onClick={sortable ? onSort : undefined}
  >
    <div className={styles.headerContent}>
      {children}
      {sortable && (
        <span className={`${styles.sortIcon} ${sorted ? styles[sorted] : ''}`}>
          {sorted === 'asc' && '↑'}
          {sorted === 'desc' && '↓'}
          {!sorted && '↕'}
        </span>
      )}
    </div>
  </th>
);

// Export components
Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;
Table.HeaderCell = TableHeaderCell;

export default Table;
