import React from 'react';
import InlineEditor from '../editor/InlineEditor';

const EducationSection = ({ data, styles, isEditing, onUpdate }) => {
    const educationList = Array.isArray(data) ? data : [];

    if ((!educationList || educationList.length === 0) && !isEditing) return null;

    return (
        <div className="resume-section" style={{ marginBottom: styles.marginBottom || 'var(--space-section)' }}>
            <h2 style={{
                fontSize: 'var(--font-size-section)',
                borderBottomWidth: styles.borderBottom ? '1.5px' : '0',
                borderBottomStyle: 'solid',
                borderBottomColor: styles.accentColor || 'var(--accent-color)',
                marginBottom: 'var(--space-para)',
                color: styles.headerColor || 'inherit',
                textTransform: styles.headerTransform || 'uppercase'
            }}>
                EDUCATION
            </h2>

            {educationList.map((edu, idx) => (
                <div key={edu.id || idx} className="resume-entry" style={{ marginBottom: 'var(--space-para)' }}>
                    <div className="entry-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline'
                    }}>
                        <div style={{
                            fontSize: 'var(--font-size-body)',
                            fontWeight: 'bold',
                            color: styles.titleColor || 'inherit',
                            flex: 1
                        }}>
                            <InlineEditor
                                value={edu.degree || 'Degree'}
                                onChange={(val) => onUpdate && onUpdate('education', edu.id, 'degree', val)}
                                isEditable={isEditing}
                                tagName="h3"
                            />
                        </div>
                        <div className="date" style={{
                            fontSize: 'var(--font-size-meta)',
                            color: styles.metaColor || '#666',
                            whiteSpace: 'nowrap',
                            marginLeft: '10px'
                        }}>
                            <InlineEditor
                                value={edu.year || 'Year'}
                                onChange={(val) => onUpdate && onUpdate('education', edu.id, 'year', val)}
                                isEditable={isEditing}
                                tagName="span"
                            />
                        </div>
                    </div>
                    <div className="company" style={{
                        fontSize: 'var(--font-size-meta)',
                        color: styles.institutionColor || 'inherit'
                    }}>
                        <InlineEditor
                            value={edu.institution || 'Institution Name'}
                            onChange={(val) => onUpdate && onUpdate('education', edu.id, 'institution', val)}
                            isEditable={isEditing}
                        />
                    </div>
                    {edu.grade && (
                        <div style={{
                            fontSize: 'var(--font-size-meta)',
                            color: styles.metaColor || '#555',
                            marginTop: '2px'
                        }}>
                            GPA / Grade: <strong>{edu.grade}</strong>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default EducationSection;
