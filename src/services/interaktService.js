// import dotenv from 'dotenv';
// dotenv.config();

// const API_KEY = process.env.INTERAKT_API_KEY;
// const BASE_URL = process.env.INTERAKT_API_URL || 'https://api.interakt.ai/v1/public/';

// /**
//  * Send a template message via Interakt API
//  */
// export async function sendInteraktTemplate(phoneNumber, templateName, languageCode = 'en', parameters = []) {
//     try {
//         const formattedPhone = phoneNumber.replace(/\D/g, '');
        
//         const url = `${BASE_URL}track/event/`;
        
//         const payload = {
//             userId: formattedPhone,
//             event: 'SendTemplateMessage',
//             traits: {
//                 templateName: templateName,
//                 languageCode: languageCode,
//                 parameters: parameters,
//                 phoneNumber: formattedPhone
//             }
//         };

//         const response = await fetch(url, {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(payload),
//         });

//         const data = await response.json();

//         if (!response.ok) {
//             throw new Error(data.message || 'Failed to send template message');
//         }

//         console.log(`✅ Interakt template sent to ${phoneNumber}`);
//         return { success: true, data };
//     } catch (error) {
//         console.error('❌ Interakt send error:', error);
//         return { success: false, error: error.message };
//     }
// }

// /**
//  * Track a user in Interakt (create or update contact)
//  */
// export async function trackUserInInterakt(userData) {
//     try {
//         const url = `${BASE_URL}track/user/`;
        
//         const payload = {
//             userId: userData.phoneNumber.replace(/\D/g, ''),
//             traits: {
//                 name: userData.fullName || '',
//                 email: userData.email || '',
//                 phone: userData.phoneNumber || '',
//                 company: userData.companyName || '',
//                 source: userData.source || 'newsletter'
//             }
//         };

//         const response = await fetch(url, {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(payload),
//         });

//         const data = await response.json();

//         if (!response.ok) {
//             throw new Error(data.message || 'Failed to track user');
//         }

//         console.log(`✅ User tracked in Interakt: ${userData.phoneNumber}`);
//         return { success: true, data };
//     } catch (error) {
//         console.error('❌ Interakt track user error:', error);
//         return { success: false, error: error.message };
//     }
// }

// /**
//  * Send WhatsApp message via Interakt
//  */
// export async function sendWhatsAppViaInterakt(phoneNumber, options = {}) {
//     if (options.template) {
//         return sendInteraktTemplate(
//             phoneNumber,
//             options.template,
//             options.language || 'en',
//             options.parameters || []
//         );
//     } else {
//         // Default: try to send as template
//         return sendInteraktTemplate(phoneNumber, 'newsletter_update', 'en', [
//             options.subject || 'Newsletter',
//             options.preview || 'Latest updates from Tooling Trends'
//         ]);
//     }
// }

import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.INTERAKT_API_KEY;
const BASE_URL = process.env.INTERAKT_API_URL || 'https://api.interakt.ai/v1/public/';

/**
 * Send a template message via Interakt API (Requires Approved Template)
 */
export async function sendInteraktTemplate(phoneNumber, templateName, languageCode = 'en', parameters = []) {
    try {
        const formattedPhone = phoneNumber.replace(/\D/g, '');
        
        const url = `${BASE_URL}track/event/`;
        
        const payload = {
            userId: formattedPhone,
            event: 'SendTemplateMessage',
            traits: {
                templateName: templateName,
                languageCode: languageCode,
                parameters: parameters,
                phoneNumber: formattedPhone
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send template message');
        }

        console.log(`✅ Interakt template sent to ${phoneNumber}`);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Interakt send error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ✅ FOR TESTING: Send WhatsApp via Event API (No Template Required)
 * You need to create an Ongoing Campaign in Interakt that triggers on this event
 */
export async function sendWhatsAppViaEvent(phoneNumber, message, subject = 'Tooling Trends Newsletter', campaignId = null) {
    try {
        const formattedPhone = phoneNumber.replace(/\D/g, '');
        const url = `${BASE_URL}track/event/`;
        
        const payload = {
            userId: formattedPhone,
            event: 'SendNewsletter', // This event name must match your Ongoing Campaign trigger
            traits: {
                phoneNumber: formattedPhone,
                message: message,
                subject: subject,
                campaignId: campaignId || 'manual_test',
                sentAt: new Date().toISOString()
            }
        };

        console.log(`📤 Sending event to Interakt for ${phoneNumber}:`, JSON.stringify(payload, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send event');
        }

        console.log(`✅ Event triggered for ${phoneNumber}:`, data);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Interakt event send error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Track a user in Interakt (create or update contact)
 */
export async function trackUserInInterakt(userData) {
    try {
        const url = `${BASE_URL}track/user/`;
        
        const payload = {
            userId: userData.phoneNumber.replace(/\D/g, ''),
            traits: {
                name: userData.fullName || '',
                email: userData.email || '',
                phone: userData.phoneNumber || '',
                company: userData.companyName || '',
                source: userData.source || 'newsletter'
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to track user');
        }

        console.log(`✅ User tracked in Interakt: ${userData.phoneNumber}`);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Interakt track user error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send WhatsApp message via Interakt (Auto-detect method)
 * For testing: uses Event API (no template required)
 * For production: uses Template API (requires approved template)
 */
export async function sendWhatsAppViaInterakt(phoneNumber, options = {}) {
    // Check if we should use test mode
    const useTestMode = process.env.INTERAKT_TEST_MODE === 'true' || options.testMode === true;
    
    if (useTestMode || !options.template) {
        // ✅ TEST MODE: Use Event API (no template required)
        console.log(`🧪 Using TEST MODE (Event API) for ${phoneNumber}`);
        return sendWhatsAppViaEvent(
            phoneNumber,
            options.message || options.preview || 'Latest updates from Tooling Trends',
            options.subject || 'Tooling Trends Newsletter',
            options.campaignId || null
        );
    } else {
        // PRODUCTION MODE: Use Template API
        console.log(`📦 Using PRODUCTION MODE (Template API) for ${phoneNumber}`);
        return sendInteraktTemplate(
            phoneNumber,
            options.template,
            options.language || 'en',
            options.parameters || []
        );
    }
}