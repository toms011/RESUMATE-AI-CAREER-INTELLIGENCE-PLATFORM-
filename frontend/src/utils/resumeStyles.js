
export const RESUME_STYLES = {
    // A4 Dimensions in mm
    pageSize: {
        width: 210,
        height: 297
    },
    // Margins in mm (Safe for print & ATS)
    margins: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
    },
    // Base Typography
    fonts: {
        body: 'Calibri, sans-serif',
        heading: 'Calibri, sans-serif'
    },
    // Base Sizes (pt) - these are the 1.0 scale values
    baseSizes: {
        headerName: 24, // pt
        headerTitle: 14,
        sectionTitle: 12,
        body: 10.5,     // Slightly smaller for better fit
        meta: 9.5       // Dates, locations
    },
    spacing: {
        lineHeight: 1.3,
        paragraphBottom: 6, // pt
        sectionBottom: 14   // pt
    }
};

// Helper to convert pt to px (approximate for screen)
export const ptToPx = (pt) => (pt * 96) / 72;
// Helper to convert mm to px
export const mmToPx = (mm) => (mm * 96) / 25.4;
