-- Fix corrupted Terms & Conditions content in cms_pages
-- The content was wrapped in <pre><code> with escaped HTML entities
-- This migration replaces it with clean HTML

UPDATE cms_pages 
SET content = '<h1>Terms &amp; Conditions</h1>

<p class="effective-date">Last Updated: October 21, 2025</p>

<p>Welcome to Rondo Sports! These Terms and Conditions govern your use of our sports ticket booking platform. By accessing or using Rondo Sports, you agree to be bound by these terms. Please read them carefully before making any bookings.</p>

<h2>1. General Terms</h2>

<h3>1.1 About Rondo Sports</h3>
<p>Rondo Sports is a comprehensive sports event management and ticketing platform that allows you to discover, book, and manage tickets for various sporting events including football, basketball, cricket, tennis, and other sporting competitions worldwide.</p>

<h3>1.2 Acceptance of Terms</h3>
<p>By creating an account, browsing events, or purchasing tickets through Rondo Sports, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions, as well as our Privacy Policy. If you do not agree with any part of these terms, you must not use our platform.</p>

<h3>1.3 Eligibility</h3>
<p>You must be at least 18 years old to create an account and purchase tickets on Rondo Sports. By using our platform, you represent and warrant that you meet this age requirement and have the legal capacity to enter into binding contracts.</p>

<h2>2. Account Registration</h2>

<h3>2.1 Account Creation</h3>
<p>To purchase tickets, you must create a Rondo Sports account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>

<h3>2.2 Account Security</h3>
<p>You agree to immediately notify Rondo Sports of any unauthorized use of your account or any other breach of security. We will not be liable for any losses caused by unauthorized use of your account.</p>

<h3>2.3 Account Termination</h3>
<p>We reserve the right to suspend or terminate your account at any time if we believe you have violated these Terms and Conditions or engaged in fraudulent or illegal activity.</p>

<h2>3. Ticket Booking &amp; Purchase</h2>

<h3>3.1 Ticket Availability</h3>
<p>All tickets are subject to availability. Rondo Sports acts as an intermediary between event organizers and customers. We do not guarantee that tickets will be available for any particular event, even if they are displayed on our platform.</p>

<h3>3.2 Pricing</h3>
<p>All ticket prices are displayed in the local currency and include applicable taxes unless otherwise stated. Additional booking fees, processing charges, or delivery fees may apply and will be clearly shown before you complete your purchase.</p>

<h3>3.3 Payment</h3>
<p>Payment must be made in full at the time of booking using one of our accepted payment methods. We accept credit cards, debit cards, net banking, UPI, and digital wallets. All payments are processed securely through our third-party payment providers.</p>

<h3>3.4 Booking Confirmation</h3>
<p>Once your payment is successfully processed, you will receive a booking confirmation via email and SMS. This confirmation serves as proof of your purchase. Please check all details carefully and contact us immediately if any information is incorrect.</p>

<div class="highlight">
    <strong>Important:</strong> Your ticket confirmation email contains important information about entry requirements, venue details, and event timing. Please read it carefully and keep it safe.
</div>

<h2>4. Ticket Delivery</h2>

<h3>4.1 E-Tickets</h3>
<p>Most tickets are delivered electronically as e-tickets via email and are also available in your Rondo Sports account. E-tickets contain a unique QR code or barcode for entry to the event.</p>

<h3>4.2 Physical Tickets</h3>
<p>For select events, physical tickets may be available for delivery to your registered address. Additional delivery charges will apply. Please allow sufficient time for delivery before the event date.</p>

<h3>4.3 Mobile Tickets</h3>
<p>Some events may offer mobile tickets accessible through the Rondo Sports mobile app. These tickets cannot be printed and must be displayed on your mobile device for entry.</p>

<h2>5. Cancellation &amp; Refund Policy</h2>

<h3>5.1 General Cancellation Policy</h3>
<p>All ticket sales are generally final. However, refunds may be issued under the following circumstances:</p>
<ul>
    <li>The event is cancelled by the organizer</li>
    <li>The event is postponed to a date when you cannot attend (subject to organizer approval)</li>
    <li>There is a significant change to the event details (venue, time, participating teams, etc.)</li>
    <li>As required by applicable law</li>
</ul>

<h3>5.2 Customer-Initiated Cancellations</h3>
<p>If you wish to cancel your booking due to personal reasons, refunds will only be provided if the event organizer''s policy permits it. Any applicable cancellation fees and processing charges will be deducted from the refund amount.</p>

<h3>5.3 Refund Processing Time</h3>
<p>Approved refunds will be processed within 7-14 business days and credited back to the original payment method. The actual time for the refund to reflect in your account may vary depending on your bank or payment provider.</p>

<h3>5.4 No-Show Policy</h3>
<p>No refunds will be issued if you fail to attend the event for any reason, including but not limited to personal emergencies, travel delays, or forgetting to bring your ticket.</p>

<h2>6. Event Entry &amp; Venue Rules</h2>

<h3>6.1 Entry Requirements</h3>
<p>You must present a valid ticket (e-ticket, physical ticket, or mobile ticket) along with a government-issued photo ID at the venue entrance. Entry may be denied if you cannot produce these documents.</p>

<h3>6.2 Age Restrictions</h3>
<p>Some events may have age restrictions. It is your responsibility to ensure that you meet the age requirements for the event you are booking. Proof of age may be required at the venue.</p>

<h3>6.3 Venue Conduct</h3>
<p>You agree to comply with all venue rules and regulations, including security checks, prohibited items lists, and behavioral guidelines. The venue management reserves the right to refuse entry or remove anyone who violates these rules.</p>

<h3>6.4 Prohibited Items</h3>
<p>Common prohibited items include weapons, illegal substances, outside food and beverages, professional cameras, laser pointers, and any items deemed dangerous by venue security. Please check the specific event details for a complete list.</p>

<h2>7. Ticket Transfer &amp; Resale</h2>

<h3>7.1 Ticket Transfers</h3>
<p>Some tickets may be transferable to another person through the Rondo Sports platform. Check your specific ticket details to see if this option is available. Unofficial transfers outside our platform are not permitted.</p>

<h3>7.2 Resale Prohibition</h3>
<p>You may not resell, transfer for profit, or otherwise commercialize tickets purchased through Rondo Sports without our express written permission. Tickets found to be resold through unauthorized channels will be cancelled without refund.</p>

<h3>7.3 Ticket Fraud</h3>
<p>Attempting to use fraudulent, duplicated, or unauthorized tickets will result in denial of entry and potential legal action. We employ various security measures to detect and prevent ticket fraud.</p>

<h2>8. Event Changes &amp; Cancellations</h2>

<h3>8.1 Event Modifications</h3>
<p>Event organizers reserve the right to change event details including date, time, venue, participating teams/players, or format. Rondo Sports will notify you of any significant changes as soon as we are informed.</p>

<h3>8.2 Event Cancellation</h3>
<p>If an event is cancelled, you will be entitled to a full refund including all booking fees. Rondo Sports is not responsible for any additional costs you may have incurred such as travel or accommodation expenses.</p>

<h3>8.3 Force Majeure</h3>
<p>Neither Rondo Sports nor event organizers shall be liable for any failure to perform obligations due to circumstances beyond reasonable control, including natural disasters, pandemics, government regulations, wars, or other force majeure events.</p>

<h2>9. Liability &amp; Disclaimers</h2>

<h3>9.1 Platform Service</h3>
<p>Rondo Sports acts solely as an intermediary between customers and event organizers. We do not organize, host, or control sporting events. Our liability is limited to the booking and ticketing services we provide.</p>

<h3>9.2 Event Quality</h3>
<p>We make no guarantees regarding the quality, safety, or enjoyment of any sporting event. Event organizers and venue operators are solely responsible for the event experience, facilities, and safety measures.</p>

<h3>9.3 Personal Injury</h3>
<p>Rondo Sports is not liable for any injury, loss, or damage you may suffer while attending an event. By purchasing a ticket, you acknowledge that sporting events may carry inherent risks and you attend at your own risk.</p>

<h3>9.4 Limitation of Liability</h3>
<p>To the maximum extent permitted by law, Rondo Sports'' total liability for any claim arising from your use of our platform shall not exceed the amount you paid for the tickets in question.</p>

<h2>10. Intellectual Property</h2>

<h3>10.1 Platform Content</h3>
<p>All content on the Rondo Sports platform, including text, graphics, logos, images, software, and design elements, is the property of Rondo Sports or its licensors and is protected by copyright and trademark laws.</p>

<h3>10.2 User License</h3>
<p>We grant you a limited, non-exclusive, non-transferable license to access and use the Rondo Sports platform for personal, non-commercial purposes only. You may not reproduce, distribute, modify, or create derivative works from our content without permission.</p>

<h2>11. Privacy &amp; Data Protection</h2>

<h3>11.1 Personal Information</h3>
<p>We collect and process your personal information in accordance with our Privacy Policy. By using Rondo Sports, you consent to such collection and processing. Please review our Privacy Policy for detailed information about how we handle your data.</p>

<h3>11.2 Marketing Communications</h3>
<p>By creating an account, you agree to receive promotional emails, SMS, and notifications about upcoming events, special offers, and platform updates. You can opt out of marketing communications at any time through your account settings.</p>

<h2>12. Dispute Resolution</h2>

<h3>12.1 Customer Support</h3>
<p>If you have any issues, complaints, or disputes, please contact our customer support team first. We are committed to resolving issues fairly and promptly.</p>

<h3>12.2 Governing Law</h3>
<p>These Terms and Conditions are governed by the laws of India. Any disputes arising from these terms or your use of Rondo Sports shall be subject to the exclusive jurisdiction of courts in Bangalore, Karnataka.</p>

<h3>12.3 Arbitration</h3>
<p>Any unresolved disputes may be referred to binding arbitration in accordance with the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted in English in Bangalore, Karnataka.</p>

<h2>13. General Provisions</h2>

<h3>13.1 Changes to Terms</h3>
<p>We reserve the right to modify these Terms and Conditions at any time. We will notify you of significant changes via email or platform notifications. Your continued use of Rondo Sports after such changes constitutes acceptance of the updated terms.</p>

<h3>13.2 Severability</h3>
<p>If any provision of these Terms and Conditions is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>

<h3>13.3 Entire Agreement</h3>
<p>These Terms and Conditions, together with our Privacy Policy and any other legal notices published on our platform, constitute the entire agreement between you and Rondo Sports.</p>

<h3>13.4 Contact Information</h3>
<p>For questions about these Terms and Conditions, please contact us at:</p>
<ul>
    <li><strong>Email:</strong> support@rondosports.com</li>
    <li><strong>Phone:</strong> +91-80-1234-5678</li>
    <li><strong>Address:</strong> Rondo Sports Pvt. Ltd., 123 Sports Avenue, Koramangala, Bangalore - 560034, Karnataka, India</li>
</ul>

<div class="highlight">
    <strong>Demo Notice:</strong> This is a sample Terms &amp; Conditions document created for demonstration purposes for the Rondo Sports platform. Actual terms may vary and should be reviewed with legal counsel before implementation.
</div>',
    updated_at = NOW()
WHERE page_key = 'terms';

-- Verify the update
SELECT id, page_key, title, LEFT(content, 200) as content_preview 
FROM cms_pages 
WHERE page_key = 'terms';
