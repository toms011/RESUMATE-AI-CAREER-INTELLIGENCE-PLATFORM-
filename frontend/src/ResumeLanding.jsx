import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import toast from 'react-hot-toast';
import Layout from './components/Layout';

function ResumeLanding() {
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleCreateNew = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        navigate('/login');
        return;
      }

      // Create a new blank resume
      const response = await api.post('/add_resume', {
        title: `My Resume - ${new Date().toLocaleDateString()}`
      });

      toast.success('Resume created!');
      navigate(`/build-resume/${response.data.resume_id}`);
    } catch (error) {
      console.error('Error creating resume:', error);
      toast.error('Failed to create resume');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/html',
      'text/rtf',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload DOC, DOCX, PDF, HTML, RTF, or TXT');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      formData.append('user_id', user.id);

      const response = await api.post('/upload_resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.source === 'database_restore') {
        toast.success('✓ ResuMate resume perfectly restored from original data!');
      } else {
        toast.success('Resume uploaded and parsed successfully!');
      }
      navigate(`/build-resume/${response.data.resume_id}`);
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume. Try creating a new one instead.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-slate-900 mb-4">
            Create a Resume That Gets Results
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Get the job 2x as fast. Use recruiter-approved templates and step-by-step content
            recommendations to create a new resume or optimize your current one.
          </p>
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Create New Resume */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 hover:border-blue-500 hover:shadow-xl transition-all">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center">
              Start with a new resume
            </h2>
            <p className="text-slate-600 mb-6 text-center">
              Get step-by-step support with expert content suggestions at your fingertips!
            </p>
            <button
              onClick={handleCreateNew}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              Create New
            </button>
          </div>

          {/* Upload Existing Resume */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 hover:border-orange-500 hover:shadow-xl transition-all">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center">
              Upload an existing resume
            </h2>
            <p className="text-slate-600 mb-6 text-center">
              Edit your resume using expertly generated content in a fresh, new design.
            </p>

            <label className="w-full cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.html,.rtf,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="w-full bg-orange-400 hover:bg-orange-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all text-center shadow-lg hover:shadow-xl">
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  <>↑ Choose File</>
                )}
              </div>
            </label>

            <p className="text-xs text-slate-500 mt-3 text-center">
              Acceptable file types: DOC, DOCX, PDF, HTML, RTF, TXT
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-10 mb-12">
          <h3 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Why Choose Our Resume Builder?
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">◆</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">35+ Template Designs</h4>
              <p className="text-slate-600">
                Choose from professionally designed templates that format automatically
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">✦</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Enhance with AI</h4>
              <p className="text-slate-600">
                Get AI-powered suggestions for skills, summaries, and job descriptions
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Finish in 15 Minutes</h4>
              <p className="text-slate-600">
                Our step-by-step wizard helps you create a professional resume quickly
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <button
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white py-4 px-12 rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-3"
          >
            <span>Get Started Now</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
          <p className="text-sm text-slate-500 mt-4">
            Join over 1 million people who created their resume with us
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default ResumeLanding;
