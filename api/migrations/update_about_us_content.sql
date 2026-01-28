-- Update About Us page content from ABOUT US.docx
-- This migration updates the cms_pages 'about' entry with the new content

UPDATE cms_pages 
SET content = '<div class="about-page">
    <p class="intro-quote"><em>From the MCG to Madison Square Garden, from Twickenham to Turnberry and from Newlands to the North Bank. Trips to watch live sports with family, friends or colleagues, have given me some of the best moments of my life and created memories that I will keep forever.</em></p>

    <p>At Rondo, we want to create an offering that will bring as wide a variety of sporting experiences to as many people as possible. Whether its just the ticket to access the stadium or the complete, bespoke package of ticket, travel and accommodation; we aim to make your bucket list sporting experience a reality.</p>

    <h2>Our Core Principles</h2>

    <ul class="principles-list">
        <li><strong>Authentic &amp; Official Tickets:</strong> All tickets supplied are official and guaranteed to be authentic and valid. Rondo only sells tickets sourced from the official suppliers of events.</li>
        <li><strong>Exceptional Customer Service:</strong> Providing the highest level of customer service to all our clients whether your sporting experience is purchased seamlessly through our website of via a bespoke package from our Rondo Platinum offering. No two trips are the same and all of them are once-in-a-lifetime experiences. We understand this.</li>
        <li><strong>Real-Time Availability:</strong> Ticket availability is shown real time on our website enabling you to secure your place at events instantaneously.</li>
    </ul>

    <div class="signature-section">
        <img src="https://apix2.redberries.ae/images/signature-will-shaw.png" alt="Will Shaw Signature" class="signature-image" />
        <p class="founder-name"><strong>Will Shaw</strong></p>
        <p class="founder-title">Founder of Rondo Sports</p>
    </div>

    <div class="venue-gallery">
        <div class="venue-item">
            <img src="https://apix2.redberries.ae/images/Twickenham.jpg" alt="Twickenham Stadium" class="venue-image" />
        </div>
        <div class="venue-item">
            <img src="https://apix2.redberries.ae/images/Newlands.jpg" alt="Newlands Stadium" class="venue-image" />
        </div>
        <div class="venue-item">
            <img src="https://apix2.redberries.ae/images/Emirates.jpg" alt="Emirates Stadium" class="venue-image" />
        </div>
    </div>
</div>',
    title = 'About Rondo Sports',
    meta_title = 'About Us | Rondo Sports - Your Premium Sports Ticket Experience',
    meta_description = 'Learn about Rondo Sports - your trusted partner for authentic sports tickets, exceptional customer service, and unforgettable sporting experiences worldwide.',
    updated_at = NOW()
WHERE page_key = 'about';

-- Verify the update
SELECT id, page_key, title, LEFT(content, 300) as content_preview 
FROM cms_pages 
WHERE page_key = 'about';
