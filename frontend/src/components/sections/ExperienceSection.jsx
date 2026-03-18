import React from 'react';
import InlineEditor from '../editor/InlineEditor';

const ExperienceSection = ({ data, styles, isEditing, onUpdate }) => {
    // data is array of experiences
    const experiences = Array.isArray(data) ? data : [];

    if ((!experiences || experiences.length === 0) && !isEditing) return null;

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
                EXPERIENCE
            </h2>

            {experiences.map((exp, idx) => (
                <div key={exp.id || idx} className="resume-entry" style={{ marginBottom: 'var(--space-para)' }}>
                    <div className="entry-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '2px',
                        alignItems: 'baseline'
                    }}>
                        <div style={{
                            fontSize: 'var(--font-size-body)',
                            fontWeight: 'bold',
                            color: styles.titleColor || 'inherit',
                            flex: 1
                        }}>
                            <InlineEditor
                                value={exp.job_title || 'Job Title'}
                                onChange={(val) => onUpdate && onUpdate('experience', exp.id, 'job_title', val)}
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
                            <div style={{ display: 'inline-block' }}>
                                <InlineEditor
                                    value={exp.start_date || 'Start'}
                                    onChange={(val) => onUpdate && onUpdate('experience', exp.id, 'start_date', val)}
                                    isEditable={isEditing}
                                    tagName="span"
                                />
                            </div>
                            {' - '}
                            <div style={{ display: 'inline-block' }}>
                                <InlineEditor
                                    value={exp.end_date || 'Present'}
                                    onChange={(val) => onUpdate && onUpdate('experience', exp.id, 'end_date', val)}
                                    isEditable={isEditing}
                                    tagName="span"
                                />
                            </div>
                        </div>
                    </div>

                    {(exp.company || isEditing) && (
                        <div className="company" style={{
                            fontSize: 'var(--font-size-meta)',
                            marginBottom: '4px',
                            fontWeight: '600',
                            color: styles.companyColor || 'inherit'
                        }}>
                            <InlineEditor
                                value={exp.company || 'Company Name'}
                                onChange={(val) => onUpdate && onUpdate('experience', exp.id, 'company', val)}
                                isEditable={isEditing}
                            />
                        </div>
                    )}

                    {(exp.description || isEditing) && (
                        <div className="description" style={{
                            fontSize: 'var(--font-size-body)',
                            lineHeight: 'var(--line-height)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            <InlineEditor
                                value={exp.description || 'Description...'}
                                onChange={(val) => onUpdate && onUpdate('experience', exp.id, 'description', val)}
                                isEditable={isEditing}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ExperienceSection;
