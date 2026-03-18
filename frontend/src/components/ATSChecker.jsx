
import React, { useState } from 'react';
import './ATSChecker.css';
import AIResumeService from '../services/AIResumeService';

const ATSChecker = ({ resumeText, isVisible, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const analyzeATS = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await AIResumeService.scoreATS(resumeText);

            if (data.error) {
                throw new Error(data.error || 'Failed to analyze resume');
            }

            if (data.ats_analysis) {
                setResult(data.ats_analysis);
            } else if (data.success === false) {
                throw new Error(data.message || 'Unknown error occurred');
            } else {
                // Fallback if structure varies, but service should ensure 'ats_analysis' or 'error'
                throw new Error('Invalid response format from AI service');
            }

        } catch (err) {
            console.error("ATS Check Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Run analysis automatically when opened if not already done? 
    // User flow says "User clicks Check ATS Compatibility". 
    // So we wait for a manual trigger inside the modal or trigger on open.
    // Let's trigger on mount if result is null and not loading?
    // Proper UX: Show "Run Analysis" button or auto-run. Let's do auto-run for smoother UX.
    React.useEffect(() => {
        if (isVisible && !result && !loading) {
            analyzeATS();
        }
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div className="ats-modal-overlay" onClick={onClose}>
            <div className="ats-modal-content" onClick={e => e.stopPropagation()}>
                <button className="ats-close-btn" onClick={onClose}>&times;</button>

                <h2>◈ ATS Compatibility Report</h2>

                {loading && (
                    <div className="ats-loading">
                        <div className="spinner"></div>
                        <p>Analyzing resume against Applicant Tracking Systems...</p>
                    </div>
                )}

                {error && (
                    <div className="ats-error">
                        <p>✕ {error}</p>
                        <button onClick={analyzeATS} className="btn-retry">Retry Analysis</button>
                    </div>
                )}

                {result && !loading && (
                    <div className="ats-results">
                        {/* Score Section */}
                        <div className="ats-score-header">
                            <div className={`ats-score-circle score-${getScoreColor(result.score)}`}>
                                <span className="score-number">{result.score}</span>
                                <span className="score-label">/ 100</span>
                            </div>
                            <div className="ats-score-summary">
                                <h3>{getScoreLabel(result.score)}</h3>
                                <p>See below for detailed feedback.</p>
                            </div>
                        </div>

                        <div className="ats-scroll-content">
                            {/* Critical Issues */}
                            <div className="ats-section">
                                <h3>⚠ Critical Issues ({result.issues?.length || 0})</h3>
                                {(!result.issues || result.issues.length === 0) ? (
                                    <p className="ats-empty-state">✦ No critical ATS issues found!</p>
                                ) : (
                                    <div className="ats-cards">
                                        {result.issues.map((issue, idx) => (
                                            <div key={idx} className="ats-card issue-card">
                                                <div className="card-header">
                                                    <span className="section-tag">{issue.section}</span>
                                                    <h4>{issue.problem}</h4>
                                                </div>
                                                <p className="reason"><strong>Why:</strong> {issue.reason}</p>
                                                <div className="fix-box">
                                                    <strong>※ Fix:</strong> {issue.fix}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Advantages */}
                            <div className="ats-section">
                                <h3>✓ Advantages ({result.advantages?.length || 0})</h3>
                                <ul className="ats-advantages-list">
                                    {result.advantages?.map((adv, idx) => (
                                        <li key={idx}>{adv}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <button className="btn-recheck" onClick={analyzeATS}>
                            ↻ Re-Check Analysis
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper Functions
const getScoreColor = (score) => {
    if (score >= 75) return 'green';
    if (score >= 50) return 'yellow';
    return 'red';
};

const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent! ATS Optimized.';
    if (score >= 75) return 'Good. Minor tweaks needed.';
    if (score >= 50) return 'Fair. Needs improvement.';
    return 'Critical. High risk of rejection.';
};

export default ATSChecker;
