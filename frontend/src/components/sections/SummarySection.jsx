import InlineEditor from '../editor/InlineEditor';
import React from 'react';

const SummarySection = ({ data, styles, isEditing, onUpdate }) => {
    // data is just the summary string or object with summary field
    const summaryText = typeof data === 'string' ? data : data?.summary;

    if (!summaryText && !isEditing) return null;

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
                PROFESSIONAL SUMMARY
            </h2>
            <div
                style={{
                    fontSize: 'var(--font-size-body)',
                    lineHeight: 'var(--line-height)',
                    textAlign: styles.textAlign || 'justify'
                }}
            >
                <InlineEditor
                    value={summaryText || ''}
                    onChange={(val) => onUpdate && onUpdate('personal_info', null, 'summary', val)}
                    isEditable={isEditing}
                />
            </div>
        </div>
    );
};

export default SummarySection;
