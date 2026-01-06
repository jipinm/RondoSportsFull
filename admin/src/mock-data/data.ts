// Mock data for Rondo Sports Admin Portal

export interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  role: 'admin' | 'super_admin' | 'content_manager' | 'support_agent' | 'client';
  type: 'admin' | 'client';
  permissions?: string[];
}

export interface Booking {
  id: string;
  eventName: string;
  userId: number;
  user: User;
  amount: number;
  status: 'confirmed' | 'cancelled' | 'refunded' | 'pending';
  bookingDate: string;
  seats: string[];
  ticketInfo: string;
  apiReferenceId: string;
}

export interface RefundRequest {
  id: string;
  bookingId: string;
  userId: number;
  user: User;
  amount: number;
  reason: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  totalBookings: number;
  totalRevenue: number;
}

export interface RevenueData {
  date: string;
  amount: number;
}

export interface BookingsOverTime {
  date: string;
  value: number;
}

// Mock Users
export const users: User[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    status: 'active',
    joinedDate: '2025-01-15',
    role: 'super_admin',
    type: 'admin',
    permissions: ['all']
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    status: 'active',
    joinedDate: '2025-02-20',
    role: 'admin',
    type: 'admin',
    permissions: ['users_manage', 'content_edit', 'reports_view', 'bookings_manage']
  },
  {
    id: 3,
    name: 'Robert Johnson',
    email: 'robert@example.com',
    status: 'active',
    joinedDate: '2025-03-10',
    role: 'client',
    type: 'client'
  },
  {
    id: 4,
    name: 'Sarah Williams',
    email: 'sarah@example.com',
    status: 'inactive',
    joinedDate: '2025-01-05',
    role: 'client',
    type: 'client'
  },
  {
    id: 5,
    name: 'Michael Brown',
    email: 'michael@example.com',
    status: 'active',
    joinedDate: '2025-04-15',
    role: 'client',
    type: 'client'
  },
  {
    id: 6,
    name: 'Emily Davis',
    email: 'emily@example.com',
    status: 'active',
    joinedDate: '2025-05-20',
    role: 'content_manager',
    type: 'admin',
    permissions: ['content_edit']
  },
  {
    id: 7,
    name: 'David Wilson',
    email: 'david@example.com',
    status: 'active',
    joinedDate: '2025-04-02',
    role: 'support_agent',
    type: 'admin',
    permissions: ['bookings_view', 'bookings_edit', 'users_view']
  },
  {
    id: 8,
    name: 'Lisa Moore',
    email: 'lisa@example.com',
    status: 'active',
    joinedDate: '2025-05-01',
    role: 'client',
    type: 'client'
  }
];

// Mock Bookings
export const bookings: Booking[] = [
  {
    id: 'BK-00001',
    eventName: 'NBA Finals 2025',
    userId: 3,
    user: users.find(user => user.id === 3) as User,
    amount: 350.00,
    status: 'confirmed',
    bookingDate: '2025-06-05',
    seats: ['A12', 'A13'],
    ticketInfo: 'VIP Section, Row A',
    apiReferenceId: 'XS2E-123456'
  },
  {
    id: 'BK-00002',
    eventName: 'NHL Stanley Cup',
    userId: 4,
    user: users.find(user => user.id === 4) as User,
    amount: 275.50,
    status: 'cancelled',
    bookingDate: '2025-06-03',
    seats: ['B22'],
    ticketInfo: 'Standard Admission, Row B',
    apiReferenceId: 'XS2E-123457'
  },
  {
    id: 'BK-00003',
    eventName: 'US Open Tennis',
    userId: 2,
    user: users.find(user => user.id === 2) as User,
    amount: 420.00,
    status: 'confirmed',
    bookingDate: '2025-06-08',
    seats: ['C05', 'C06', 'C07'],
    ticketInfo: 'Premium Seats, Row C',
    apiReferenceId: 'XS2E-123458'
  },
  {
    id: 'BK-00004',
    eventName: 'MLB All-Star Game',
    userId: 5,
    user: users.find(user => user.id === 5) as User,
    amount: 180.00,
    status: 'confirmed',
    bookingDate: '2025-06-07',
    seats: ['D14'],
    ticketInfo: 'Standard Admission, Row D',
    apiReferenceId: 'XS2E-123459'
  },
  {
    id: 'BK-00005',
    eventName: 'NBA Finals 2025',
    userId: 1,
    user: users.find(user => user.id === 1) as User,
    amount: 700.00,
    status: 'refunded',
    bookingDate: '2025-06-01',
    seats: ['A01', 'A02'],
    ticketInfo: 'VIP Section, Row A',
    apiReferenceId: 'XS2E-123460'
  },
  {
    id: 'BK-00006',
    eventName: 'Formula 1 Grand Prix',
    userId: 6,
    user: users.find(user => user.id === 6) as User,
    amount: 550.00,
    status: 'confirmed',
    bookingDate: '2025-06-10',
    seats: ['E09', 'E10'],
    ticketInfo: 'Grandstand Seats, Row E',
    apiReferenceId: 'XS2E-123461'
  },
  {
    id: 'BK-00007',
    eventName: 'UEFA Champions League Final',
    userId: 3,
    user: users.find(user => user.id === 3) as User,
    amount: 480.00,
    status: 'pending',
    bookingDate: '2025-06-09',
    seats: ['B18', 'B19'],
    ticketInfo: 'Standard Admission, Row B',
    apiReferenceId: 'XS2E-123462'
  }
];

// Mock Refund Requests
export const refundRequests: RefundRequest[] = [
  {
    id: 'RF-00001',
    bookingId: 'BK-00005',
    userId: 1,
    user: users.find(user => user.id === 1) as User,
    amount: 700.00,
    reason: 'Unable to attend due to medical emergency',
    requestDate: '2025-06-06',
    status: 'approved'
  },
  {
    id: 'RF-00002',
    bookingId: 'BK-00002',
    userId: 4,
    user: users.find(user => user.id === 4) as User,
    amount: 275.50,
    reason: 'Event date conflict',
    requestDate: '2025-06-05',
    status: 'pending'
  },
  {
    id: 'RF-00003',
    bookingId: 'BK-00007',
    userId: 3,
    user: users.find(user => user.id === 3) as User,
    amount: 240.00,
    reason: 'Seat location not as expected',
    requestDate: '2025-06-10',
    status: 'pending'
  },
  {
    id: 'RF-00004',
    bookingId: 'BK-00004',
    userId: 5,
    user: users.find(user => user.id === 5) as User,
    amount: 180.00,
    reason: 'Double booking error',
    requestDate: '2025-06-09',
    status: 'rejected'
  }
];

// Mock Events
export const events: Event[] = [
  {
    id: 'EV-00001',
    name: 'NBA Finals 2025',
    date: '2025-06-15',
    venue: 'Madison Square Garden, New York',
    totalBookings: 1250,
    totalRevenue: 875000
  },
  {
    id: 'EV-00002',
    name: 'NHL Stanley Cup',
    date: '2025-06-20',
    venue: 'Rogers Arena, Vancouver',
    totalBookings: 980,
    totalRevenue: 490000
  },
  {
    id: 'EV-00003',
    name: 'US Open Tennis',
    date: '2025-08-25',
    venue: 'USTA Billie Jean King National Tennis Center, New York',
    totalBookings: 760,
    totalRevenue: 532000
  },
  {
    id: 'EV-00004',
    name: 'MLB All-Star Game',
    date: '2025-07-14',
    venue: 'Yankee Stadium, New York',
    totalBookings: 1100,
    totalRevenue: 660000
  },
  {
    id: 'EV-00005',
    name: 'Formula 1 Grand Prix',
    date: '2025-06-25',
    venue: 'Circuit of the Americas, Austin',
    totalBookings: 850,
    totalRevenue: 722500
  },
  {
    id: 'EV-00006',
    name: 'UEFA Champions League Final',
    date: '2025-05-30',
    venue: 'Wembley Stadium, London',
    totalBookings: 1350,
    totalRevenue: 945000
  }
];

// Mock data for charts
export const bookingsOverTime: BookingsOverTime[] = [
  { date: '2025-06-01', value: 42 },
  { date: '2025-06-02', value: 55 },
  { date: '2025-06-03', value: 38 },
  { date: '2025-06-04', value: 65 },
  { date: '2025-06-05', value: 72 },
  { date: '2025-06-06', value: 58 },
  { date: '2025-06-07', value: 50 },
  { date: '2025-06-08', value: 45 },
  { date: '2025-06-09', value: 60 },
  { date: '2025-06-10', value: 70 },
  { date: '2025-06-11', value: 75 }
];

// Mock Revenue Data
export const revenueData: RevenueData[] = [
  { date: '2025-06-01', amount: 25000 },
  { date: '2025-06-02', amount: 35000 },
  { date: '2025-06-03', amount: 22000 },
  { date: '2025-06-04', amount: 40000 },
  { date: '2025-06-05', amount: 55000 },
  { date: '2025-06-06', amount: 32000 },
  { date: '2025-06-07', amount: 30000 },
  { date: '2025-06-08', amount: 27000 },
  { date: '2025-06-09', amount: 42000 },
  { date: '2025-06-10', amount: 50000 },
  { date: '2025-06-11', amount: 60000 }
];

// Dashboard summary data
export const dashboardSummary = {
  bookingsToday: 75,
  bookingsThisWeek: 420,
  bookingsThisMonth: 1250,
  totalRevenue: 845000,
  totalRefunds: 25600,
  topEvents: [
    { name: 'NBA Finals 2025', bookings: 1250 },
    { name: 'UEFA Champions League Final', bookings: 1350 },
    { name: 'MLB All-Star Game', bookings: 1100 },
    { name: 'NHL Stanley Cup', bookings: 980 }
  ]
};

// Content management pages
export const cmsPages = {
  terms: `<h1>Terms and Conditions</h1>
<p>Last updated: June 1, 2025</p>
<h2>1. Introduction</h2>
<p>Welcome to Rondo Sports Ticketing. These terms and conditions govern your use of our website and services.</p>
<h2>2. Acceptance of Terms</h2>
<p>By accessing our website, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.</p>
<h2>3. Ticket Purchases</h2>
<p>All ticket purchases are final. Refunds are subject to our refund policy.</p>`,
  
  privacy: `<h1>Privacy Policy</h1>
<p>Last updated: June 1, 2025</p>
<h2>1. Information We Collect</h2>
<p>We collect personal information when you register, make a purchase, or interact with our platform.</p>
<h2>2. How We Use Your Information</h2>
<p>Your information is used to process transactions, manage your account, and improve our services.</p>
<h2>3. Data Security</h2>
<p>We implement security measures to protect your personal information.</p>`,
  
  about: `<h1>About Us</h1>
<p>Rondo Sports Ticketing has been connecting fans to live sports events since 2020.</p>
<h2>Our Mission</h2>
<p>To provide sports fans with easy access to the best events worldwide, with transparent pricing and exceptional customer service.</p>
<h2>Our Values</h2>
<p>Integrity, Excellence, and Innovation drive everything we do.</p>`
};

// Banner content for CMS
export const banners = [
  {
    id: 1,
    title: 'NBA Finals 2025',
    subtitle: 'Don\'t miss the biggest basketball event of the year',
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=400&ixid=MnwxfDB8MXxyYW5kb218MHx8YmFza2V0YmFsbCxuYmF8fHx8fHwxNzE4MTgwODky&ixlib=rb-4.0.3&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=1200',
    linkUrl: '/events/nba-finals',
    active: true
  },
  {
    id: 2,
    title: 'Formula 1 Grand Prix',
    subtitle: 'Experience the thrill of F1 racing',
    imageUrl: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=400&ixid=MnwxfDB8MXxyYW5kb218MHx8Zm9ybXVsYTEscmFjaW5nfHx8fHx8MTcxODE4MDkyNw&ixlib=rb-4.0.3&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=1200',
    linkUrl: '/events/f1-grand-prix',
    active: true
  },
  {
    id: 3,
    title: 'Summer Sports Special',
    subtitle: '20% off selected events this summer',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=400&ixid=MnwxfDB8MXxyYW5kb218MHx8c3VtbWVyLHNwb3J0c3x8fHx8fDE3MTgxODA5NDM&ixlib=rb-4.0.3&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=1200',
    linkUrl: '/promotions/summer-special',
    active: false
  }
];
