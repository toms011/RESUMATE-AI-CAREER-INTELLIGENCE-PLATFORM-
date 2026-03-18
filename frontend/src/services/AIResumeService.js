/**
 * AI Resume Service - Frontend integration with Gemini API endpoints
 * Handles all AI-powered resume enhancement requests
 */
import api from '../utils/api';

export const AIResumeService = {
  /**
   * Enhance job experience description
   */
  async enhanceJobDescription(jobTitle, company, description) {
    try {
      const response = await api.post('/api/ai/enhance-job-description', {
        job_title: jobTitle, company, description
      });
      return response.data;
    } catch (error) {
      console.error('Error enhancing job description:', error);
      return { error: error.message };
    }
  },

  /**
   * Enhance education description
   */
  async enhanceEducation(degree, institution, description) {
    try {
      const response = await api.post('/api/ai/enhance-education', {
        degree, institution, description
      });
      return response.data;
    } catch (error) {
      console.error('Error enhancing education:', error);
      return { error: error.message };
    }
  },

  /**
   * Enhance generic text
   */
  async enhanceText(text, contextType = "general") {
    try {
      const response = await api.post('/api/ai/enhance-text', {
        text, context_type: contextType
      });
      return response.data;
    } catch (error) {
      console.error('Error enhancing text:', error);
      return { error: error.message };
    }
  },

  /**
   * Generate a professional summary
   */
  async generateSummary(fullName, jobTitle, experienceYears, skills) {
    try {
      const response = await api.post('/api/ai/generate-summary', {
        full_name: fullName, job_title: jobTitle,
        experience_years: experienceYears, skills
      });
      return response.data;
    } catch (error) {
      console.error('Error generating summary:', error);
      return { error: error.message };
    }
  },

  /**
   * Suggest skills improvements
   */
  async improveSkills(skills, jobTitle = null, previousJobs = []) {
    try {
      const response = await api.post('/api/ai/improve-skills', {
        skills, job_title: jobTitle, previous_jobs: previousJobs
      });
      return response.data;
    } catch (error) {
      console.error('Error improving skills:', error);
      return { error: error.message };
    }
  },

  /**
   * Score resume for ATS compatibility
   */
  async scoreATS(resumeText) {
    try {
      const response = await api.post('/api/ai/ats-score', {
        resume_text: resumeText
      });
      return response.data;
    } catch (error) {
      console.error('Error scoring ATS:', error);
      return { error: error.message };
    }
  },

  /**
   * Match resume against a job posting
   */
  async matchJobPosting(resumeText, jobPosting) {
    try {
      const response = await api.post('/api/ai/job-match', {
        resume_text: resumeText, job_posting: jobPosting
      });
      return response.data;
    } catch (error) {
      console.error('Error matching job posting:', error);
      return { error: error.message };
    }
  }
};

export default AIResumeService;
