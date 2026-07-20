// lib/newsletterEmail.js

export const newsletterHtml = (campaign) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${campaign?.subject || 'Tooling Trends Newsletter'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background-color: #f0f2f6;
      padding: 20px;
    }
    
    .email-container {
      max-width: 650px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    
    /* ===== HEADER ===== */
    .header {
      background: #0b1a2e;
      padding: 28px 32px 20px 32px;
      border-bottom: 4px solid #f5a623;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .logo h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    
    .logo h1 span {
      color: #f5a623;
    }
    
    .logo .tagline {
      color: #8a9fb0;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    
    .header-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .header-badges span {
      color: #b0c7db;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(255,255,255,0.06);
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    
    .header-badges span:first-child {
      color: #f5a623;
      border-color: rgba(245,166,35,0.3);
    }
    
    .newsletter-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.07);
    }
    
    .newsletter-meta .label {
      color: #8a9fb0;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    
    .newsletter-meta .date {
      color: #b0c7db;
      font-size: 13px;
      font-weight: 400;
    }
    
    /* ===== BODY ===== */
    .body {
      padding: 26px 32px 22px 32px;
    }
    
    /* Feature Story */
    .feature {
      background: #f8faff;
      border-radius: 10px;
      padding: 20px 24px;
      border-left: 5px solid #f5a623;
      margin-bottom: 28px;
    }
    
    .feature .badge {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #f5a623;
      margin-bottom: 4px;
    }
    
    .feature h2 {
      font-size: 20px;
      font-weight: 700;
      color: #0b1a2e;
      line-height: 1.3;
      margin-bottom: 6px;
    }
    
    .feature p {
      font-size: 14px;
      color: #3d5166;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    
    .feature a {
      color: #f5a623;
      font-weight: 600;
      text-decoration: none;
      font-size: 13px;
    }
    
    .feature a:hover {
      text-decoration: underline;
    }
    
    /* Section Headers */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      margin-top: 6px;
    }
    
    .section-header h3 {
      font-size: 16px;
      font-weight: 700;
      color: #0b1a2e;
      margin: 0;
    }
    
    .section-header a {
      font-size: 13px;
      color: #f5a623;
      font-weight: 600;
      text-decoration: none;
    }
    
    .section-header a:hover {
      text-decoration: underline;
    }
    
    /* Insight Cards */
    .insight-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 26px;
    }
    
    .insight-item {
      background: #f9fafc;
      border-radius: 8px;
      padding: 14px 18px;
      border: 1px solid #eef1f5;
    }
    
    .insight-item h4 {
      font-size: 14px;
      font-weight: 600;
      color: #0b1a2e;
      margin-bottom: 3px;
    }
    
    .insight-item p {
      font-size: 13px;
      color: #5a6f84;
      margin-bottom: 4px;
    }
    
    .insight-item a {
      font-size: 13px;
      color: #f5a623;
      font-weight: 600;
      text-decoration: none;
    }
    
    .insight-item a:hover {
      text-decoration: underline;
    }
    
    /* Trends */
    .trends-box {
      background: #f9fafc;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 26px;
      border: 1px solid #eef1f5;
    }
    
    .trends-box ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .trends-box li {
      padding: 6px 0;
      border-bottom: 1px solid #eef1f5;
      font-size: 13px;
      color: #1d3144;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .trends-box li:last-child {
      border-bottom: 0;
    }
    
    .trends-box li::before {
      content: "▸";
      color: #f5a623;
      font-weight: 700;
      font-size: 16px;
    }
    
    /* Expert View */
    .expert-box {
      background: #f8faff;
      border-radius: 10px;
      padding: 18px 22px;
      border: 1px solid #eef1f5;
      margin-bottom: 26px;
    }
    
    .expert-box .expert-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #f5a623;
      margin-bottom: 4px;
    }
    
    .expert-box .quote {
      font-size: 18px;
      font-weight: 600;
      color: #0b1a2e;
      line-height: 1.4;
      margin-bottom: 6px;
    }
    
    .expert-box .quote::before {
      content: "\u201C";
      color: #f5a623;
      font-size: 26px;
      font-weight: 700;
      margin-right: 4px;
    }
    
    .expert-box .author {
      font-size: 14px;
      font-weight: 600;
      color: #0b1a2e;
    }
    
    .expert-box .author-title {
      font-size: 13px;
      color: #5a6f84;
    }
    
    .expert-box .read-link {
      display: inline-block;
      margin-top: 8px;
      font-size: 13px;
      color: #f5a623;
      font-weight: 600;
      text-decoration: none;
    }
    
    .expert-box .read-link:hover {
      text-decoration: underline;
    }
    
    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 26px;
    }
    
    .stat-card {
      background: #f9fafc;
      border-radius: 10px;
      padding: 14px 12px;
      text-align: center;
      border: 1px solid #eef1f5;
    }
    
    .stat-card .number {
      font-size: 20px;
      font-weight: 700;
      color: #0b1a2e;
      line-height: 1.2;
    }
    
    .stat-card .number .small {
      font-size: 13px;
      font-weight: 400;
      color: #5a6f84;
    }
    
    .stat-card .label {
      font-size: 11px;
      color: #5a6f84;
      margin-top: 2px;
    }
    
    .stat-card .view-link {
      display: inline-block;
      margin-top: 4px;
      font-size: 12px;
      color: #f5a623;
      font-weight: 600;
      text-decoration: none;
    }
    
    /* Events */
    .events-list {
      background: #f9fafc;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 26px;
      border: 1px solid #eef1f5;
    }
    
    .events-list .event-item {
      padding: 7px 0;
      border-bottom: 1px solid #eef1f5;
    }
    
    .events-list .event-item:last-child {
      border-bottom: 0;
    }
    
    .events-list .event-name {
      font-weight: 600;
      color: #0b1a2e;
      font-size: 14px;
    }
    
    .events-list .event-detail {
      font-size: 12px;
      color: #5a6f84;
    }
    
    .events-list .view-link {
      display: inline-block;
      margin-top: 8px;
      font-size: 13px;
      color: #f5a623;
      font-weight: 600;
      text-decoration: none;
    }
    
    /* Resource */
    .resource-box {
      background: #f8faff;
      border-radius: 10px;
      padding: 16px 20px;
      border: 1px solid #eef1f5;
      margin-bottom: 22px;
      text-align: center;
    }
    
    .resource-box h4 {
      font-size: 15px;
      font-weight: 700;
      color: #0b1a2e;
      margin-bottom: 4px;
    }
    
    .resource-box p {
      font-size: 13px;
      color: #5a6f84;
      margin-bottom: 8px;
    }
    
    .resource-box .btn {
      display: inline-block;
      background: #f5a623;
      color: #ffffff;
      padding: 8px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
    }
    
    .resource-box .btn:hover {
      background: #e0991e;
    }
    
    /* CTA Grid */
    .cta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 22px;
    }
    
    .cta-item {
      background: #f9fafc;
      border-radius: 8px;
      padding: 12px 14px;
      border: 1px solid #eef1f5;
      text-align: center;
    }
    
    .cta-item .icon {
      font-size: 18px;
      display: block;
      margin-bottom: 3px;
    }
    
    .cta-item h5 {
      font-size: 13px;
      font-weight: 600;
      color: #0b1a2e;
      margin-bottom: 2px;
    }
    
    .cta-item p {
      font-size: 11px;
      color: #5a6f84;
    }
    
    /* Advertise */
    .advertise-box {
      text-align: center;
      padding: 12px 0;
      background: #f8faff;
      border-radius: 8px;
      border: 1px solid #eef1f5;
      margin-bottom: 6px;
    }
    
    .advertise-box p:first-child {
      font-size: 13px;
      font-weight: 600;
      color: #0b1a2e;
      margin: 0;
    }
    
    .advertise-box p:last-child {
      font-size: 13px;
      color: #f5a623;
      font-weight: 600;
      margin: 2px 0 0 0;
    }
    
    /* ===== FOOTER ===== */
    .footer {
      background: #f8faff;
      padding: 18px 32px 22px 32px;
      border-top: 1px solid #eef1f5;
      text-align: center;
    }
    
    .footer .social {
      display: flex;
      justify-content: center;
      gap: 14px;
      margin-bottom: 10px;
    }
    
    .footer .social a {
      color: #5a6f84;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
    }
    
    .footer .social a:hover {
      color: #f5a623;
    }
    
    .footer .footer-text {
      font-size: 11px;
      color: #8a9fb0;
      line-height: 1.6;
    }
    
    .footer .footer-text a {
      color: #8a9fb0;
      text-decoration: underline;
    }
    
    .footer .footer-text a:hover {
      color: #f5a623;
    }
    
    .footer .brand {
      font-size: 13px;
      font-weight: 700;
      color: #0b1a2e;
      margin-top: 8px;
    }
    
    .footer .brand span {
      color: #f5a623;
    }
    
    .footer .brand-sub {
      font-weight: 400;
      font-size: 11px;
      color: #8a9fb0;
    }
    
    /* ===== RESPONSIVE ===== */
    @media (max-width: 600px) {
      body {
        padding: 10px;
      }
      
      .header {
        padding: 18px 20px 16px 20px;
      }
      
      .logo h1 {
        font-size: 20px;
      }
      
      .header-top {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .header-badges span {
        font-size: 9px;
        padding: 3px 10px;
      }
      
      .newsletter-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
      
      .body {
        padding: 18px 20px 16px 20px;
      }
      
      .feature h2 {
        font-size: 17px;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      
      .cta-grid {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      
      .expert-box .quote {
        font-size: 16px;
      }
      
      .footer {
        padding: 14px 20px 18px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    
    <!-- ===== HEADER ===== -->
    <div class="header">
      <div class="header-top">
        <div class="logo">
          <h1>TOOLING <span>TRENDS</span></h1>
          <div class="tagline">India's Premier Portal for Tooling Industry</div>
        </div>
        <div class="header-badges">
          <span>Industry Insights</span>
          <span>Technology Updates</span>
          <span>Business Growth</span>
        </div>
      </div>
      <div class="newsletter-meta">
        <span class="label">Newsletter</span>
        <span class="date">${campaign?.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} | Issue #${campaign?.issueNumber || '25'}</span>
      </div>
    </div>
    
    <!-- ===== BODY ===== -->
    <div class="body">
      
      <!-- Feature Story -->
      <div class="feature">
        <div class="badge">Feature Story</div>
        <h2>${campaign?.featureTitle || 'The Future of Precision Manufacturing in India'}</h2>
        <p>${campaign?.featureDescription || 'From smart factories to advanced metrology, India\'s manufacturing sector is entering a new era of precision, productivity and global competitiveness.'}</p>
        <a href="${campaign?.featureLink || '#'}">Read Full Story →</a>
      </div>
      
      <!-- Top Industry Insights -->
      <div class="section-header">
        <h3>Top Industry Insights</h3>
        <a href="#">View All Insights →</a>
      </div>
      
      <div class="insight-list">
        <div class="insight-item">
          <h4>Tool & Die Industry Outlook 2025: Trends, Challenges & Opportunities</h4>
          <p>Key insights into market growth, investments and technology adoption.</p>
          <a href="#">Read More →</a>
        </div>
        <div class="insight-item">
          <h4>Metrology 4.0: How Digital Transformation is Redefining Quality Assurance</h4>
          <p>The rise of automation, AI and IoT in metrology and inspection.</p>
          <a href="#">Read More →</a>
        </div>
        <div class="insight-item">
          <h4>Automation in Manufacturing: Driving Efficiency & Consistency</h4>
          <p>How robotics and smart systems are improving shopfloor productivity.</p>
          <a href="#">Read More →</a>
        </div>
        <div class="insight-item">
          <h4>Sustainability in Manufacturing: A Competitive Advantage</h4>
          <p>Why sustainable practices are becoming critical for manufacturers.</p>
          <a href="#">Read More →</a>
        </div>
      </div>
      
      <!-- Industry Trends -->
      <div class="section-header">
        <h3>Industry Trends</h3>
        <a href="#">View All Trends →</a>
      </div>
      
      <div class="trends-box">
        <ul>
          <li>Additive Manufacturing in Tooling: From Prototyping to Production</li>
          <li>High-Performance Tool Materials: What's Next?</li>
          <li>Electric Vehicles & Tooling: Opportunities for Indian Manufacturers</li>
          <li>Global Supply Chain Shifts: Impact on Indian Tooling Industry</li>
          <li>Government Initiatives Supporting Advanced Manufacturing in India</li>
        </ul>
      </div>
      
      <!-- Expert View -->
      <div class="expert-box">
        <div class="expert-label">Expert View</div>
        <div class="quote">The next decade will belong to manufacturers who embrace innovation, invest in skills and adopt smart technologies.</div>
        <div class="author">Rajesh Sharma</div>
        <div class="author-title">Managing Director, Precision Tools Pvt. Ltd.</div>
        <a href="#" class="read-link">Read Expert Views →</a>
      </div>
      
      <!-- Industry Statistics -->
      <div class="section-header">
        <h3>Industry Statistics</h3>
        <a href="#">View More Stats →</a>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="number">3.1 Lakh <span class="small">Cr</span></div>
          <div class="label">Projected growth by 2030</div>
        </div>
        <div class="stat-card">
          <div class="number">8–10%</div>
          <div class="label">Estimated CAGR (2024–2030)</div>
        </div>
        <div class="stat-card">
          <div class="number">$5.6B</div>
          <div class="label">Exports expected by 2026</div>
          <a href="#" class="view-link">Growing Exports →</a>
        </div>
      </div>
      
      <!-- Upcoming Events -->
      <div class="section-header">
        <h3>Upcoming Industry Events</h3>
        <a href="#">View All Events →</a>
      </div>
      
      <div class="events-list">
        <div class="event-item">
          <div class="event-name">DIE & MOULD</div>
          <div class="event-detail">23 – 29 Jan 2025 | BIEC, Bengaluru</div>
        </div>
        <div class="event-item">
          <div class="event-name">DIE & MOULD India 2025</div>
          <div class="event-detail">20 – 23 Feb 2025 | Chennai Trade Centre, Chennai</div>
        </div>
        <div class="event-item">
          <div class="event-name">ToolTech 2025</div>
          <div class="event-detail">11 – 14 Apr 2025 | Pragati Maidan, New Delhi</div>
        </div>
        <a href="#" class="view-link">View All Events →</a>
      </div>
      
      <!-- Featured Resource -->
      <div class="resource-box">
        <h4>Featured Resource</h4>
        <p><strong>TOOLING INDUSTRY OUTLOOK 2025</strong><br>An exclusive report on market trends, technology, key players and growth opportunities.</p>
        <a href="#" class="btn">Download Report →</a>
      </div>
      
      <!-- CTA Grid -->
      <div class="cta-grid">
        <div class="cta-item">
          <span class="icon">📋</span>
          <h5>Post Your Requirement</h5>
          <p>Connect with verified suppliers</p>
        </div>
        <div class="cta-item">
          <span class="icon">🏪</span>
          <h5>Product Marketplace</h5>
          <p>Explore products & latest solutions</p>
        </div>
        <div class="cta-item">
          <span class="icon">📄</span>
          <h5>Technical Articles</h5>
          <p>In-depth knowledge from industry experts</p>
        </div>
        <div class="cta-item">
          <span class="icon">📂</span>
          <h5>Company Directory</h5>
          <p>Find leading tooling companies</p>
        </div>
      </div>
      
      <!-- Advertise -->
      <div class="advertise-box">
        <p>Showcase Your Products. Reach the Right Audience.</p>
        <p>Advertise on ToolingTrends.com</p>
      </div>
      
    </div>
    
    <!-- ===== FOOTER ===== -->
    <div class="footer">
      <div class="social">
        <a href="#">Facebook</a>
        <a href="#">LinkedIn</a>
        <a href="#">Twitter</a>
        <a href="#">Instagram</a>
      </div>
      
      <div class="footer-text">
        You are receiving this email because you are a registered user on ToolingTrends.com<br>
        <a href="#">Unsubscribe</a> | <a href="#">Update Preferences</a>
      </div>
      
      <div class="brand">
        Tooling<span>Trends</span>.com<br>
        <span class="brand-sub">India's Premier Portal for Tooling Industry</span>
      </div>
    </div>
    
  </div>
</body>
</html>
  `;
};