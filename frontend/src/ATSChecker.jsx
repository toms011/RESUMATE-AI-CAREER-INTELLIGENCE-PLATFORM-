import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function ATSChecker() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null); // Clear previous results
        }
    };

    const handleAnalyze = async () => {
        if (!file) {
            toast.error("Please select a file first");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            const response = await axios.post('http://127.0.0.1:5000/ats/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log("Analysis Result:", response.data);
            setResult(response.data.ats_analysis); // Expecting { ats_analysis: { score, issues, advantages } }
            toast.success("Analysis Complete!");
        } catch (error) {
            console.error("ATS Analysis error:", error);
            toast.error("Failed to analyze resume. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 text-white">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                    <span>◎</span> ATS Resume Checker
                </h2>
                <p className="text-purple-100 opacity-90 mt-2">
                    Upload your resume to see how well it scores against Applicant Tracking Systems.
                </p>
            </div>

            <div className="p-8">
                {/* Upload Section */}
                {!result && (
                    <div className="max-w-xl mx-auto">
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                            <input
                                type="file"
                                accept=".pdf,.docx,.txt"
                                onChange={handleFileChange}
                                className="hidden"
                                id="ats-upload"
                            />
                            <label htmlFor="ats-upload" className="cursor-pointer block">
                                <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                    ↑
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">
                                    {file ? file.name : "Click to Upload Resume"}
                                </h3>
                                <p className="text-slate-500 text-sm">
                                    Supported formats: PDF, DOCX, TXT (Max 5MB)
                                </p>
                            </label>
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={!file || loading}
                            className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${!file || loading
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-purple-500/30'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analyzing...
                                </span>
                            ) : (
                                "Analyze Resume"
                            )}
                        </button>
                    </div>
                )}

                {/* Results Section */}
                {result && (
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-6">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            <span>AI-generated content — please review carefully before use.</span>
                        </div>
                        <div className="flex flex-col md:flex-row gap-8 mb-8">
                            {/* Score Card */}
                            <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-200 md:w-1/3">
                                <h3 className="text-slate-500 font-bold uppercase tracking-wider text-sm mb-4">ATS Score</h3>
                                <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            className="text-slate-200"
                                            strokeWidth="12"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="70"
                                            cx="80"
                                            cy="80"
                                        />
                                        <circle
                                            className={`${result.score >= 80 ? 'text-green-500' :
                                                    result.score >= 60 ? 'text-yellow-500' : 'text-red-500'
                                                } transition-all duration-1000 ease-out`}
                                            strokeWidth="12"
                                            strokeDasharray={440}
                                            strokeDashoffset={440 - (440 * result.score) / 100}
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="70"
                                            cx="80"
                                            cy="80"
                                        />
                                    </svg>
                                    <span className="absolute text-4xl font-extrabold text-slate-800">
                                        {result.score}
                                    </span>
                                </div>
                                <p className="mt-4 font-medium text-slate-600">
                                    {result.score >= 80 ? "Excellent Job! →" :
                                        result.score >= 60 ? "Good Start! ✓" : "Needs Improvement ⚒"}
                                </p>
                            </div>

                            {/* Summary / Strengths */}
                            <div className="md:w-2/3 space-y-6">
                                {/* Advantages */}
                                {result.advantages && result.advantages.length > 0 && (
                                    <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                                        <h4 className="text-green-800 font-bold mb-3 flex items-center gap-2">
                                            <span>✓</span> Strengths
                                        </h4>
                                        <ul className="space-y-2">
                                            {result.advantages.map((item, idx) => (
                                                <li key={idx} className="text-green-700 text-sm flex items-start gap-2">
                                                    <span className="mt-1">•</span> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Issues */}
                                {result.issues && result.issues.length > 0 && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                                        <h4 className="text-red-800 font-bold mb-3 flex items-center gap-2">
                                            <span>⚠</span> Issues Detected
                                        </h4>
                                        <div className="space-y-4">
                                            {result.issues.map((issue, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-bold uppercase bg-red-100 text-red-600 px-2 py-1 rounded">
                                                            {issue.section || "General"}
                                                        </span>
                                                    </div>
                                                    <p className="font-bold text-slate-800 text-sm mb-1">{issue.problem}</p>
                                                    <p className="text-slate-600 text-xs mb-3">{issue.reason}</p>
                                                    <div className="bg-blue-50 text-blue-700 p-3 rounded text-sm flex gap-2">
                                                        <span>※</span>
                                                        <span className="font-medium">{issue.fix}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => { setFile(null); setResult(null); }}
                            className="mx-auto block text-slate-500 hover:text-slate-800 font-medium transition-colors"
                        >
                            Start New Analysis
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ATSChecker;
