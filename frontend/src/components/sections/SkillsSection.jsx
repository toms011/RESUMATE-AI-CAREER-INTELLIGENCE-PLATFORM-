import React from 'react';
import InlineEditor from '../editor/InlineEditor';

const SkillsSection = ({ data, styles, isEditing, onUpdate }) => {
    const skillsList = Array.isArray(data) ? data : [];

    if ((!skillsList || skillsList.length === 0) && !isEditing) return null;

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
                SKILLS
            </h2>

            <div style={{
                fontSize: 'var(--font-size-body)',
                lineHeight: 'var(--line-height)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: styles.tagStyle ? '8px' : '4px' // Close gap if comma separated
            }}>
                {skillsList.map((skill, idx) => {
                    const skillName = typeof skill === 'string' ? skill : skill.name;
                    const skillId = typeof skill === 'string' ? null : skill.id; // Fallback if string

                    return (
                        <span key={skillId || idx} style={{
                            backgroundColor: styles.tagStyle ? (styles.accentColor + '20') : 'transparent',
                            padding: styles.tagStyle ? '2px 8px' : '0',
                            borderRadius: styles.tagStyle ? '4px' : '0',
                            color: styles.tagStyle ? styles.accentColor : 'inherit',
                            fontWeight: styles.tagStyle ? '500' : 'normal',
                            display: 'inline-flex',
                            alignItems: 'center'
                        }}>
                            <InlineEditor
                                value={skillName || 'Skill'}
                                onChange={(val) => onUpdate && skillId && onUpdate('skills', skillId, 'name', val)}
                                isEditable={isEditing}
                                tagName="span"
                                style={{ width: 'auto', minWidth: '20px', display: 'inline-block' }}
                            />
                            {!styles.tagStyle && idx < skillsList.length - 1 && <span>, </span>}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

export default SkillsSection;
