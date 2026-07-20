// src/lib/packages.js - Complete copy of your data

export const SUBSCRIPTION_PLANS = [
    { id: "free", name: "Free", price: 0 },
    { id: "basic", name: "Basic", price: 9999 },
    { id: "professional", name: "Professional", price: 24999 },
    { id: "enterprise", name: "Enterprise", price: 99999 },
];

export const SUBSCRIPTION_FEATURES = [
    { name: "Company Profile", free: "Standard", basic: "Enhanced", professional: "Premium", enterprise: "Premium+" },
    { name: "Company Logo", free: true, basic: true, professional: true, enterprise: true },
    { name: "Cover Banner", free: false, basic: "1", professional: "3", enterprise: "5" },
    { name: "Company Description", free: "150 Words", basic: "1000 Words", professional: "2500 Words", enterprise: "Unlimited" },
    { name: "Contact Details", free: "Limited", basic: "Full", professional: "Full", enterprise: "Full" },
    { name: "Website Link", free: true, basic: true, professional: true, enterprise: true },
    { name: "Google Map", free: true, basic: true, professional: true, enterprise: true },
    { name: "WhatsApp Button", free: false, basic: true, professional: true, enterprise: true },
    { name: "Company Gallery", free: false, basic: "10 Images", professional: "15 Images", enterprise: "Unlimited" },
    { name: "Factory Images", free: false, basic: "10", professional: "30", enterprise: "Unlimited" },
    { name: "Product Categories", free: "3", basic: "10", professional: "30", enterprise: "Unlimited" },
    { name: "Product Listings", free: "5", basic: "25", professional: "100", enterprise: "Unlimited" },
    { name: "Product Images", free: "10", basic: "50", professional: "100", enterprise: "Unlimited" },
    { name: "Product Videos", free: false, basic: "5", professional: "20", enterprise: "Unlimited" },
    { name: "Product Catalogues (PDF)", free: false, basic: "2", professional: "10", enterprise: "Unlimited" },
    { name: "Company Brochure", free: false, basic: true, professional: true, enterprise: true },
    { name: "Certifications Display", free: false, basic: true, professional: true, enterprise: true },
    { name: "Brands Represented", free: false, basic: "10", professional: "Unlimited", enterprise: "Unlimited" },
    { name: "Industries Served", free: "5", basic: "20", professional: "Unlimited", enterprise: "Unlimited" },
    { name: "Export Markets", free: false, basic: true, professional: true, enterprise: true },
    { name: "Manufacturing Capabilities", free: false, basic: "Basic", professional: "Complete", enterprise: "Complete + Photos+Video" },
    { name: "Machinery List", free: false, basic: "Basic", professional: "Detailed", enterprise: "Detailed with Images" },
    { name: "Quality Standards", free: false, basic: true, professional: true, enterprise: true },
    { name: "Team Profiles", free: false, basic: "5", professional: "10", enterprise: "Unlimited" },
    { name: "Verified Supplier Badge", free: false, basic: "Silver", professional: "Gold", enterprise: "Platinum" },
    { name: "Technical Articles", free: false, basic: "4/year", professional: "12/year", enterprise: "Unlimited" },
    { name: "Product Launch Announcements", free: false, basic: false, professional: "6/year", enterprise: "Unlimited" },
    { name: "Job Postings", free: "2", basic: "20", professional: "Unlimited", enterprise: "Unlimited" },
    { name: "Internship Listings", free: false, basic: "10", professional: "Unlimited", enterprise: "Unlimited" },
    { name: "Featured Job", free: false, basic: false, professional: "10 Days", enterprise: "30 Days" },
    { name: "Company Career Page", free: false, basic: false, professional: false, enterprise: true },
    { name: "Resume Download", free: false, basic: "10", professional: "20", enterprise: "Unlimited" },
    { name: "RFQ Leads", free: false, basic: "10 Leads / month", professional: "20 leads / per month", enterprise: "unlimited" },
    { name: "Quote Request Form", free: false, basic: "yes", professional: "yes", enterprise: "Yes" },
    { name: "Lead Notifications", free: "Email", basic: "Email", professional: "Email+SMS", enterprise: "Email+Whatsapp+SMS Realtime" },
    { name: "Search Ranking", free: "Standard", basic: "Priority", professional: "Top Results", enterprise: "#1 Priority" },
    { name: "Featured in Category", free: false, basic: true, professional: true, enterprise: true },
    { name: "Homepage Featured", free: false, basic: false, professional: "1 AD / PER MONTH", enterprise: "1 AD PER WEEK" },
    { name: "Newsletter Promotion", free: false, basic: "3 times per year", professional: "6 times per year", enterprise: "Every Month" },
    { name: "Social Media Promotion", free: false, basic: "1 Post/Year", professional: "6 Post/Year", enterprise: "12 Posts/Year" },
    { name: "Homepage Spotlight", free: false, basic: false, professional: true, enterprise: true },
    { name: "Trending Supplier Badge", free: false, basic: false, professional: false, enterprise: true },
    { name: "Homepage Hero Banner", free: false, basic: false, professional: false, enterprise: "1 / Rotational" },
    { name: "Homepage Sidebar", free: false, basic: false, professional: "1 / Rotational", enterprise: "1 / Rotational" },
    { name: "Category Banner", free: false, basic: false, professional: false, enterprise: "1 / Rotational" },
    { name: "Article Banner", free: false, basic: false, professional: "1 / Rotational", enterprise: "1 / Rotational" },
    { name: "Sticky Banner", free: false, basic: false, professional: false, enterprise: "1 / Rotational" },
    { name: "Factory Visit Feature", free: false, basic: false, professional: false, enterprise: "1/Year" },
    { name: "Product Demo Video on Home Page", free: false, basic: false, professional: "1/Year", enterprise: "4/ Year" },
    { name: "Email Support", free: true, basic: true, professional: true, enterprise: "Priority" },
    { name: "Phone Support", free: false, basic: false, professional: true, enterprise: true },
    { name: "Dedicated Account Manager", free: false, basic: false, professional: false, enterprise: true },
];

export const BANNER_PACKAGES = [
    { id: "homepage-hero", position: "Homepage Hero Banner", monthly: 40000, quarterly: 108000, annual: 360000 },
    { id: "homepage-sidebar", position: "Homepage Sidebar", monthly: 18000, quarterly: 48000, annual: 160000 },
    { id: "category", position: "Category Banner", monthly: 12000, quarterly: 32000, annual: 110000 },
    { id: "article", position: "Article Banner", monthly: 8000, quarterly: 22000, annual: 75000 },
    { id: "sticky", position: "Sticky Banner", monthly: 25000, quarterly: 70000, annual: 240000 },
];

export const SPONSORED_CONTENT_PACKAGES = [
    {
        id: "bronze",
        name: "Bronze",
        price: 15000,
        features: ["Sponsored Article", "Social Media Promotion", "Newsletter Mention"],
    },
    {
        id: "silver",
        name: "Silver",
        price: 35000,
        features: [
            "Featured Article",
            "Homepage for 7 Days",
            "LinkedIn Promotion",
            "Newsletter Feature",
            "SEO Optimized",
        ],
    },
    {
        id: "gold",
        name: "Gold",
        price: 60000,
        features: [
            "Premium Sponsored Story",
            "Homepage for 30 Days",
            "Video Interview",
            "Newsletter",
            "Social Campaign",
            "Lead Collection Form",
        ],
    },
];

export const RECRUITMENT_PACKAGES = [
    { id: "single-job", name: "Single Job (Monthly · 30 Days)", price: 2000, durationDays: 30 },
];

export function formatInr(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}