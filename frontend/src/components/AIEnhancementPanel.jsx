import React, { useState } from 'react';
import AIResumeService from '../services/AIResumeService';

export function AIEnhancementPanel() {
  const [activeTab, setActiveTab] = useState('job-enhance');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    description: '',
    fullName: '',
    targetJobTitle: '',
    experienceYears: 0,
    skills: '',
    resumeText: '',
    jobPosting: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEnhanceJobDescription = async () => {
    if (!formData.jobTitle || !formData.company || !formData.description) {
      alert('Please fill all fields');
      return;
    }
    setLoading(true);
    setResult(null);
    console.log('Calling AI service...');
    try {
      const res = await AIResumeService.enhanceJobDescription(
        formData.jobTitle,
        formData.company,
        formData.description
      );
      console.log('AI Response:', res);
      // Error will be displayed in the UI result area
      setResult(res);
    } catch (error) {
      console.error('Error in handler:', error);
      alert('Failed to connect to AI service');
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  const handleGenerateSummary = async () => {
    if (!formData.fullName || !formData.targetJobTitle) {
      alert('Please fill required fields');
      return;
    }
    setLoading(true);
    const skillsArray = formData.skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s);
    const res = await AIResumeService.generateSummary(
      formData.fullName,
      formData.targetJobTitle,
      parseInt(formData.experienceYears) || 0,
      skillsArray
    );
    setResult(res);
    setLoading(false);
  };

  const handleImproveSkills = async () => {
    if (!formData.skills) {
      alert('Please enter skills');
      return;
    }
    setLoading(true);
    const skillsArray = formData.skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s);
    const res = await AIResumeService.improveSkills(
      skillsArray,
      formData.targetJobTitle || null
    );
    setResult(res);
    setLoading(false);
  };

  const handleATS = async () => {
    if (!formData.resumeText) {
      alert('Please enter resume text');
      return;
    }
    setLoading(true);
    const res = await AIResumeService.scoreATS(formData.resumeText);
    setResult(res);
    setLoading(false);
  };

  const handleJobMatch = async () => {
    if (!formData.resumeText || !formData.jobPosting) {
      alert('Please fill all fields');
      return;
    }
    setLoading(true);
    const res = await AIResumeService.matchJobPosting(
      formData.resumeText,
      formData.jobPosting
    );
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="ai-enhancement-panel p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">✦ AI Resume Enhancement</h2>

      {/* API Status Check */}
      <div className="mb-4 p-3 bg-white rounded border border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">API Status:</span>
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
            Ready (Gemini Pro)
          </span>
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b">
        {[
          { id: 'job-enhance', label: 'Enhance Job Description' },
          { id: 'summary', label: 'Generate Summary' },
          { id: 'skills', label: 'Improve Skills' },
          { id: 'ats', label: 'ATS Score' },
          { id: 'job-match', label: 'Job Match' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t font-medium transition ${activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-b-lg shadow">
        {/* Enhance Job Description */}
        {activeTab === 'job-enhance' && (
          <div className="space-y-4">
            <input
              type="text"
              name="jobTitle"
              placeholder="Job Title"
              value={formData.jobTitle}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              name="company"
              placeholder="Company Name"
              value={formData.company}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              name="description"
              placeholder="Current job description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleEnhanceJobDescription}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Enhancing...' : 'Enhance with AI'}
            </button>
          </div>
        )}

        {/* Generate Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              name="targetJobTitle"
              placeholder="Target Job Title"
              value={formData.targetJobTitle}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              name="experienceYears"
              placeholder="Years of Experience"
              value={formData.experienceYears}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              name="skills"
              placeholder="Skills (comma separated)"
              value={formData.skills}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleGenerateSummary}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Generating...' : 'Generate Summary'}
            </button>
          </div>
        )}

        {/* Improve Skills */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <textarea
              name="skills"
              placeholder="Your skills (comma separated)"
              value={formData.skills}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              name="targetJobTitle"
              placeholder="Target Job Title (optional)"
              value={formData.targetJobTitle}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleImproveSkills}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Analyzing...' : 'Get Suggestions'}
            </button>
          </div>
        )}

        {/* ATS Score */}
        {activeTab === 'ats' && (
          <div className="space-y-4">
            <textarea
              name="resumeText"
              placeholder="Paste your complete resume text here"
              value={formData.resumeText}
              onChange={handleInputChange}
              rows="6"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleATS}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Scoring...' : 'Check ATS Compatibility'}
            </button>
          </div>
        )}

        {/* Job Match */}
        {activeTab === 'job-match' && (
          <div className="space-y-4">
            <textarea
              name="resumeText"
              placeholder="Paste your resume text"
              value={formData.resumeText}
              onChange={handleInputChange}
              rows="4"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              name="jobPosting"
              placeholder="Paste the job posting"
              value={formData.jobPosting}
              onChange={handleInputChange}
              rows="4"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleJobMatch}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Matching...' : 'Analyze Job Match'}
            </button>
          </div>
        )}
      </div>

      {/* Results Display */}
      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-bold text-lg text-gray-800 mb-3">
            {result.error ? '✕ Error' : '✦ AI Results:'}
          </h3>
          {!result.error && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>AI-generated content — please review carefully before use.</span>
            </div>
          )}

          {result.error ? (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
              <p className="font-semibold">Error:</p>
              <p>{result.error}</p>
            </div>
          ) : result.success === false ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-700">
              <p>{JSON.stringify(result, null, 2)}</p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="mt-4 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Clear Results
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-indigo-700 font-medium">Processing with AI...</p>
        </div>
      )}
    </div>
  );
}

export default AIEnhancementPanel;
