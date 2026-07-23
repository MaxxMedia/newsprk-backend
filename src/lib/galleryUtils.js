// lib/galleryUtils.js

/**
 * Check if a gallery item is in legacy string format
 */
export function isLegacyGalleryItem(item) {
    return typeof item === 'string';
}

/**
 * Convert a legacy string gallery item to the new object format
 */
export function convertToGalleryObject(item) {
    if (typeof item === 'string') {
        return {
            image: item,
            name: '',
            description: ''
        };
    }
    return item;
}

/**
 * Convert a gallery array from legacy format to object format
 * Handles both string arrays and mixed arrays
 */
export function normalizeGalleryArray(galleryArray) {
    if (!galleryArray || !Array.isArray(galleryArray)) {
        return [];
    }

    return galleryArray
        .filter(item => item !== null && item !== undefined && item !== '')
        .map(item => convertToGalleryObject(item));
}

/**
 * Validate a single gallery item
 */
export function validateGalleryItem(item) {
    const errors = [];

    if (!item.image || typeof item.image !== 'string' || item.image.trim() === '') {
        errors.push('Image URL is required');
    }

    if (item.name !== undefined && typeof item.name !== 'string') {
        errors.push('Name must be a string');
    }

    if (item.description !== undefined && typeof item.description !== 'string') {
        errors.push('Description must be a string');
    }

    return errors;
}

/**
 * Validate and sanitize a gallery array
 */
export function validateAndSanitizeGalleryArray(galleryArray) {
    if (!galleryArray || !Array.isArray(galleryArray)) {
        return { valid: true, data: [], errors: [] };
    }

    const validatedItems = [];
    const errors = [];

    for (let i = 0; i < galleryArray.length; i++) {
        const item = galleryArray[i];

        // Convert legacy string format
        const normalizedItem = convertToGalleryObject(item);

        // Validate
        const itemErrors = validateGalleryItem(normalizedItem);
        if (itemErrors.length > 0) {
            errors.push(`Item ${i + 1}: ${itemErrors.join(', ')}`);
            continue;
        }

        // Sanitize - ensure all fields exist
        validatedItems.push({
            image: normalizedItem.image.trim(),
            name: (normalizedItem.name || '').trim(),
            description: (normalizedItem.description || '').trim()
        });
    }

    return {
        valid: errors.length === 0,
        data: validatedItems,
        errors
    };
}

/**
 * Count gallery items (supports both legacy and new formats)
 */
export function countGalleryItems(galleryArray) {
    if (!galleryArray || !Array.isArray(galleryArray)) {
        return 0;
    }
    return galleryArray.filter(item => item !== null && item !== undefined && item !== '').length;
}

/**
 * Check if a gallery item has an image
 */
export function hasGalleryImage(item) {
    if (!item) return false;
    if (typeof item === 'string') return item.trim().length > 0;
    return item.image && typeof item.image === 'string' && item.image.trim().length > 0;
}

/**
 * Get image URL from a gallery item (handles both formats)
 */
export function getGalleryImage(item) {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.image || '';
}

/**
 * Get name from a gallery item (handles both formats)
 */
export function getGalleryName(item) {
    if (!item) return '';
    if (typeof item === 'string') return '';
    return item.name || '';
}

/**
 * Get description from a gallery item (handles both formats)
 */
export function getGalleryDescription(item) {
    if (!item) return '';
    if (typeof item === 'string') return '';
    return item.description || '';
}