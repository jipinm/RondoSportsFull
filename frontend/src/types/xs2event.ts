/**
 * XS2Event API Types
 * Comprehensive TypeScript interfaces for all XS2Event API endpoints
 * Based on xs2event.com official documentation
 */

// ===========================================
// PAGINATION INTERFACE
// ===========================================

export interface Pagination {
  total_size: number;
  page_size: number;
  page_number: number;
  next_page?: string;
  previous_page?: string;
}

// ===========================================
// BOOKING INTERFACES
// ===========================================

export interface BookingItem {
  quantity: number;
  salesprice: number;
  net_rate: number;
  currency: string;
  ticket_id: string;
  ticket_name: string;
  event_id: string;
  event_name: string;
  event_season?: string;
  tournament_name?: string;
}

export interface Booking {
  booking_id: string;
  reservation_id: string;
  booking_code: string;
  created: string;
  updated: string;
  client_id: string;
  booking_email: string;
  payment_method: string;
  payment_reference: string;
  booking_reference: string;
  distributorfinancial_status: string;
  logistic_status: string;
  deleted?: string | null;
  items: BookingItem[];
}

export interface BookingsResponse {
  bookings: Booking[];
  pagination: Pagination;
}

export interface BookingsQueryParams {
  sorting?: string;
  page_size?: number;
  page?: number;
  reservation_id?: string;
  booking_id?: string;
  booking_code?: string;
  distributor_id?: string;
  client_id?: string;
  event_id?: string;
  booking_email?: string;
  compare_mode?: 'AND' | 'OR';
  query?: string;
  mass_booking?: boolean;
}

// ===========================================
// BOOKING ORDERS INTERFACES
// ===========================================

export interface GuestData {
  first_name: string;
  last_name: string;
  passport_number?: string;
  contact_email: string;
  contact_phone?: string;
  lead_guest?: boolean;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  country_of_residence?: string;
  street_name?: string;
  additional_street_name?: string;
  city?: string;
  zip?: string;
  province?: string;
  guest_id?: string | null;
  conditions?: Record<string, any>;
  reservation_id?: string;
  ticket_id?: string;
}

export interface DownloadItem {
  download_link: string;
  external_activation_link?: string;
  ticket_sha: string;
  downloaditem_id: string;
  activated?: string;
  label: string;
}

export interface BookingOrderItem {
  activated?: string;
  category_id: string;
  category_name: string;
  currency: string;
  distribution_channel?: string;
  download_items?: DownloadItem[];
  download_link?: string;
  external_activation_link?: string;
  face_value?: number;
  face_value_eur?: number;
  face_value_local?: number;
  face_value_target?: number;
  guest?: GuestData;
  local_currency?: string;
  net_rate: number;
  orderitem_id: string;
  quantity: number;
  row?: string;
  sales_price?: number;
  sales_price_eur?: number;
  sales_price_local?: number;
  sales_price_target?: number;
  salesprice: number;
  seat?: string;
  section?: string;
  sub_category?: string;
  target_currency?: string;
  ticket_currency: string;
  ticket_id: string;
  ticket_name: string;
  ticket_sha?: string;
  ticket_startdate?: string;
  ticket_status: string;
  ticket_stopdate?: string;
  ticket_targetgroup?: string;
  ticket_validity?: string;
  type_ticket: string;
  number_of_pdfs?: number;
}

export interface BookingOrderListItem {
  booking_id: string;
  bookingorder_id: string;
  event_id: string;
  created: string;
  distributor_id: string;
  accepted_gt: boolean;
  marketing_optin: boolean;
  mass_booking_allowed: boolean;
  api_booking: boolean;
  offline_booking: boolean;
  booking_code: string;
  zip_sha?: string | null;
  guestdata_status: string;
  max_pdfs_per_ticket: number;
  distributorfinancial_status: string;
  logistic_status: string;
  event_name: string;
  payment_method: string;
  payment_reference: string;
  booking_reference: string;
  parent_id?: string;
  client_id: string;
  booking_email: string;
  notify_client_status: string;
  invoices: string[];
  bookingorder_source: string;
  is_test_booking: boolean;
  items: Array<{
    quantity: number;
    ticket_id: string;
    ticket_name: string;
    type_ticket: string;
    ticket_status: string;
  }>;
  event_startdate?: string;
  event_stopdate?: string;
  booking_group?: string;
  supplier_id?: string;
  deleted?: string | null;
  external_payment_reference?: string;
  financial_status?: string;
  general_terms_url?: string;
  onbehalfclient_id?: string;
}

export interface BookingOrder {
  booking_id: string;
  bookingorder_id: string;
  event_id: string;
  created: string;
  distributor_id: string;
  accepted_gt: boolean;
  marketing_optin: boolean;
  mass_booking_allowed: boolean;
  api_booking: boolean;
  offline_booking: boolean;
  booking_code: string;
  zip_sha?: string | null;
  guestdata_status: string;
  max_pdfs_per_ticket: number;
  distributorfinancial_status: string;
  logistic_status: string;
  event_name: string;
  payment_method: string;
  payment_reference: string;
  booking_reference: string;
  parent_id?: string;
  client_id: string;
  booking_email: string;
  notify_client_status: string;
  invoices: string[];
  bookingorder_source: string;
  is_test_booking: boolean;
  items: BookingOrderItem[];
}

export interface BookingOrdersResponse {
  bookingorders: BookingOrderListItem[];
  pagination: Pagination;
}

export interface BookingOrdersQueryParams {
  sorting?: string;
  page_size?: number;
  page?: number;
  booking_id?: string;
  bookingorder_id?: string;
  event_id?: string;
  distributor_id?: string;
  client_id?: string;
  booking_email?: string;
  booking_code?: string;
  compare_mode?: 'AND' | 'OR';
  query?: string;
  guestdata_status?: string;
  distributorfinancial_status?: string;
  logistic_status?: string;
  created_from?: string;
  created_until?: string;
  mass_booking?: boolean;
}

// ===========================================
// GUEST DATA INTERFACES
// ===========================================

export interface GuestDataItem {
  ticket_id: string;
  quantity: number;
  guests: GuestData[];
}

export interface GuestDataResponse {
  bookingorder_id?: string | null;
  items: GuestDataItem[];
}

export interface UpdateGuestDataRequest {
  items: GuestDataItem[];
}

// ===========================================
// E-TICKETS INTERFACES
// ===========================================

export interface ETicketQueryParams {
  booking_id?: string;
  booking_order_id?: string;
  order_item_id?: string;
  status?: string;
  format?: 'pdf' | 'pkpass' | 'all';
  created_from?: string;
  created_until?: string;
  page?: number;
  limit?: number;
}

// E-Ticket download URL response is just a string
export type ETicketZipUrlResponse = string;

// ===========================================
// ERROR INTERFACES
// ===========================================

export interface ValidationError {
  errors: Record<string, any>;
  message: string;
}

export interface ApiErrorResponse {
  message: string | {
    invalid?: string;
    not_found?: string;
  };
}

// ===========================================
// REQUEST/RESPONSE WRAPPER INTERFACES
// ===========================================

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

// ===========================================
// SERVICE INTERFACES
// ===========================================

export interface BookingService {
  getBookings(params?: BookingsQueryParams): Promise<BookingsResponse>;
  getBooking(bookingId: string): Promise<Booking>;
  getBookingsByReservation(reservationId: string, sorting?: string): Promise<Booking>;
}

export interface BookingOrderService {
  getBookingOrders(params?: BookingOrdersQueryParams): Promise<BookingOrdersResponse>;
  getBookingOrder(bookingOrderId: string): Promise<BookingOrder>;
  getGuestData(bookingOrderId: string): Promise<GuestDataResponse>;
  updateGuestData(bookingOrderId: string, guestData: UpdateGuestDataRequest): Promise<GuestDataResponse>;
  getSingleGuestData(bookingOrderId: string, guestId: string): Promise<GuestData>;
  updateSingleGuestData(bookingOrderId: string, guestId: string, guestData: GuestData): Promise<GuestData>;
}

export interface ETicketService {
  getETicketZipUrl(bookingOrderId: string): Promise<string>;
  downloadETicket(bookingOrderId: string, orderItemId: string, url: string): Promise<void>;
}

// ===========================================
// FRONTEND-SPECIFIC INTERFACES
// ===========================================

export interface BookingOrderWithDetails extends BookingOrder {
  // Additional computed fields for frontend display
  totalAmount?: number;
  ticketCount?: number;
  hasGuestDataRequired?: boolean;
  isDownloadable?: boolean;
}

export interface GuestFormData extends Omit<GuestData, 'guest_id'> {
  // Frontend form-specific fields
  isValid?: boolean;
  errors?: Record<keyof GuestData, string>;
}

// ===========================================
// HOOK RETURN INTERFACES
// ===========================================

export interface UseBookingsResult {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  pagination?: Pagination;
  getBookings: (params?: BookingsQueryParams) => Promise<void>;
  getBooking: (bookingId: string) => Promise<Booking | null>;
  getBookingsByReservation: (reservationId: string) => Promise<Booking | null>;
  clearError: () => void;
  // Helper methods
  getBookingStatusDisplay?: (booking: Booking) => { status: string; color: 'success' | 'warning' | 'error' | 'info'; description: string; };
  formatBookingForDisplay?: (booking: Booking) => { title: string; subtitle: string; totalAmount: number; currency: string; ticketCount: number; eventNames: string[]; };
  calculateBookingTotal?: (booking: Booking) => number;
  hasETickets?: (booking: Booking) => boolean;
  getQuickFilters?: () => { today: BookingsQueryParams; thisWeek: BookingsQueryParams; thisMonth: BookingsQueryParams; pending: BookingsQueryParams; completed: BookingsQueryParams; };
}

export interface UseBookingOrdersResult {
  bookingOrders: BookingOrderListItem[];
  currentBookingOrder: BookingOrder | null;
  loading: boolean;
  error: string | null;
  pagination?: Pagination;
  getBookingOrders: (params?: BookingOrdersQueryParams) => Promise<void>;
  getBookingOrder: (bookingOrderId: string) => Promise<BookingOrder | null>;
  clearError: () => void;
}

export interface UseGuestDataResult {
  guestData: GuestDataResponse | null;
  singleGuest: GuestData | null;
  loading: boolean;
  error: string | null;
  getGuestData: (bookingOrderId: string) => Promise<void>;
  updateGuestData: (bookingOrderId: string, data: UpdateGuestDataRequest) => Promise<void>;
  getSingleGuestData: (bookingOrderId: string, guestId: string) => Promise<void>;
  updateSingleGuestData: (bookingOrderId: string, guestId: string, data: GuestData) => Promise<void>;
  clearError: () => void;
}