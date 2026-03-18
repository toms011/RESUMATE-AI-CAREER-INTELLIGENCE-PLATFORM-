export const TEMPLATES = [
    {
        id: 1,
        name: 'Classic Professional',
        description: 'Traditional, clean layout suitable for corporate environments.',
        category: 'classic',
        previewImage: '/templates/classic.png',
        sectionOrder: [
            'HeaderSection',
            'SummarySection',
            'ExperienceSection',
            'EducationSection',
            'SkillsSection'
        ],
        styles: {
            fontFamily: 'Times New Roman, serif',
            accentColor: '#333333',
            nameColor: '#000000',
            borderBottom: true,
            textAlign: 'left',
            marginBottom: 'var(--space-section)',
            headerTransform: 'uppercase',
            allowProfileImage: true,
            imagePosition: 'right',
            imageShape: 'square',
            imageSize: 85,
        }
    },
    {
        id: 2,
        name: 'Modern Minimal',
        description: 'Sleek, sans-serif design with bold headers and clean spacing.',
        category: 'modern',
        previewImage: '/templates/modern.png',
        sectionOrder: [
            'HeaderSection',
            'SummarySection',
            'SkillsSection',
            'ExperienceSection',
            'EducationSection'
        ],
        styles: {
            fontFamily: 'Inter, sans-serif',
            accentColor: '#2563EB',
            nameColor: '#1E40AF',
            borderBottom: false,
            textAlign: 'left',
            marginBottom: '2rem',
            tagStyle: true,
            headerTransform: 'none',
            nameWeight: '800',
            allowProfileImage: true,
            imagePosition: 'right',
            imageShape: 'circle',
            imageSize: 90,
        }
    },
    {
        id: 3,
        name: 'Minimal Clean',
        description: 'Simple and clean for maximum ATS compatibility.',
        category: 'minimal',
        previewImage: '/templates/creative.png',
        sectionOrder: [
            'HeaderSection',
            'SummarySection',
            'ExperienceSection',
            'EducationSection',
            'SkillsSection'
        ],
        styles: {
            fontFamily: 'Calibri, sans-serif',
            accentColor: '#475569',
            textAlign: 'left',
            borderBottom: true,
            headerTransform: 'uppercase',
            headerColor: '#1e293b',
            allowProfileImage: false,    // ATS-strict template — no image
            imagePosition: 'right',
            imageShape: 'square',
            imageSize: 80,
        }
    }
];

export const getTemplateById = (id) => TEMPLATES.find(t => t.id === Number(id)) || TEMPLATES[0];
