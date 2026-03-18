import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './ResumeStart.css';

function ResumeStart() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleCreateNew = async () => {
    setIsCreating(true);
    const toastId = toast.loading('Creating new resume...');

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        toast.error('Please log in again', { id: toastId });
        navigate('/login');
        return;
      }

      const response = await api.post('/add_resume', {
        title: `My Resume - ${new Date().toLocaleDateString()}`,
      });

      const newResumeId = response.data.resume_id;
      toast.success('New resume created!', { id: toastId });
      navigate(`/build-resume/${newResumeId}`);

    } catch (error) {
      console.error('Error creating new resume:', error);
      toast.error('Could not create a new resume. Please try again.', { id: toastId });
      setIsCreating(false);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Uploading & parsing resume...');
    setIsUploading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        toast.error('Please log in again', { id: toastId });
        navigate('/login');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload_resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const resumeId = response.data.resume_id;
      if (response.data.source === 'database_restore') {
        toast.success('✓ ResuMate resume perfectly restored from original data!', { id: toastId });
      } else {
        toast.success('Resume parsed successfully!', { id: toastId });
      }
      navigate(`/build-resume/${resumeId}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="resume-start-container">
      <div className="start-card">
        <div className="start-header">
          <h1>Let's Get Started</h1>
          <p>How would you like to begin building your resume?</p>
        </div>
        <div className="start-options">
          <div className="option-box" onClick={!isCreating ? handleCreateNew : undefined}>
            <div className="option-icon">✎</div>
            <h2>Create from Scratch</h2>
            <p>Build your resume step-by-step with our guided builder.</p>
            <button className="btn-start" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Start Building'}
            </button>
          </div>
          <div className="option-box" onClick={handleUploadClick}>
            <div className="option-icon">▤</div>
            <h2>Upload Existing Resume</h2>
            <p>We'll parse your resume to pre-fill the fields for you.</p>
            <button className="btn-start-outline" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload File'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.rtf,.html"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>
        <div className="start-footer">
          <button onClick={() => navigate('/dashboard')} className="back-to-dashboard">
            &larr; Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResumeStart;