
// Simulated Global Skills Dataset
// Simulated Global Skills Dataset
const GLOBAL_SKILLS = [
    // --- Tech & Engineering ---
    "Python", "Java", "JavaScript", "React", "Node.js", "C++", "C#", "SQL", "HTML5", "CSS3",
    "Git", "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "Machine Learning",
    "Data Analysis", "Artificial Intelligence", "Cybersecurity", "Blockchain", "AutoCAD",
    "SolidWorks", "MATLAB", "Circuit Design", "Thermodynamics", "Prompt Engineering",
    "Cloud Computing", "Automation", "Zapier", "Advanced Spreadsheet Proficiency",
    "UX/UI Design Basics", "Technical Writing",

    // --- Marketing & Business ---
    "SEO", "SEM", "Content Marketing", "Google Analytics", "Social Media Marketing",
    "Email Marketing", "Copywriting", "Brand Strategy", "Market Research", "Digital Marketing",
    "Project Management", "Agile", "Scrum", "Business Analysis", "Strategic Planning",
    "Leadership", "Team Management", "Communication", "Public Speaking", "Negotiation",
    "Financial Literacy", "Accounting", "Bookkeeping", "Excel", "Financial Modeling",
    "Sales Skills", "Account Management", "Customer Service Orientation", "Process Optimization",
    "Digital Storytelling", "Personal Branding", "Video Creation/Editing",

    // --- Life Skills & Practical ---
    "Budgeting", "Tax Filing", "Basic Cooking", "Cleaning/Housekeeping", "Laundry Management",
    "Basic Sewing", "Basic Home Maintenance", "Plumbing Basics", "Tool Usage", "Driving",
    "Tire Changing", "Swim/Water Safety", "First Aid", "CPR", "Time Management",
    "Grocery Planning", "Basic Gardening", "Emergency Preparedness", "Fire Safety",
    "Reading Nutrition Labels", "Basic Mental Math", "Organization", "Personal Grooming",
    "Social Etiquette", "Gift Wrapping", "Navigating Public Transport", "Airport Navigation",
    "Physical Fitness", "Stress Coping", "Conflict Resolution", "Digital Skills",

    // --- Communication & Interpersonal ---
    "Active Listening", "Verbal Communication", "Written Communication", "Nonverbal Communication",
    "Empathy", "Feedback Reception", "Feedback Delivery", "Networking", "Small Talk",
    "Intergenerational Communication", "Cultural Intelligence", "Persuasion", "Conflict De-escalation",
    "Presentation Design", "Meeting Facilitation", "Civic Engagement", "Interviewing", "Mentoring",

    // --- Cognitive & Emotional Intelligence ---
    "Resilience", "Emotional Intelligence", "Self-Motivation", "Growth Mindset", "Patience",
    "Self-Awareness", "Focus/Concentration", "Decision Fatigue Management", "Curiosity",
    "Integrity", "Adversity Quotient", "Candor", "Sense of Self", "Reflective Practice",
    "Systematic Thinking", "Psychological Safety Creation", "Cultural Awareness",
    "Goal Setting", "Innovation", "Critical Thinking", "Creative Problem Solving",
    "Adaptability", "Decision Making", "Ethical Reasoning", "Resourcefulness"
].sort();

// Context Mapping for Intelligent Suggestions
const KEYWORD_MAPPINGS = {
    // Software / IT
    "software": ["Java", "Python", "JavaScript", "React", "SQL", "Git", "Agile", "Cloud Computing", "Prompt Engineering"],
    "developer": ["Java", "Python", "JavaScript", "React", "Node.js", "Git", "Docker", "UX/UI Design Basics"],
    "engineer": ["Problem Solving", "Mathematics", "Project Management", "Technical Writing", "Systematic Thinking"],
    "frontend": ["HTML5", "CSS3", "JavaScript", "React", "Vue.js", "Figma", "UX/UI Design Basics"],
    "backend": ["Node.js", "Python", "Java", "SQL", "MongoDB", "AWS", "API Development", "Cloud Computing"],
    "data": ["SQL", "Python", "Data Analysis", "Machine Learning", "Tableau", "Excel", "Critical Thinking"],
    "web": ["HTML5", "CSS3", "JavaScript", "React", "WordPress", "SEO", "Digital Skills"],
    "security": ["Cybersecurity", "Network Security", "Ethical Hacking", "Linux", "Cybersecurity Awareness"],
    "ai": ["Artificial Intelligence", "Machine Learning", "Prompt Engineering", "Data Analysis"],

    // Marketing & Content
    "marketing": ["SEO", "Content Marketing", "Social Media Marketing", "Google Analytics", "Copywriting", "Digital Storytelling"],
    "social": ["Social Media Marketing", "Content Creation", "Community Management", "Instagram", "LinkedIn", "Networking"],
    "content": ["Copywriting", "Editing", "Content Strategy", "SEO", "Research", "Video Creation/Editing"],
    "writer": ["Written Communication", "Copywriting", "Technical Writing", "Editing", "Digital Storytelling"],

    // Business & Management
    "manager": ["Leadership", "Team Management", "Strategic Planning", "Project Management", "Communication", "Conflict Resolution", "Empathy"],
    "business": ["Business Analysis", "Strategic Planning", "Financial Analysis", "Excel", "Presentation Design"],
    "sales": ["Negotiation", "CRM", "Lead Generation", "Communication", "Persuasion", "Sales Skills", "Account Management"],
    "admin": ["Organization", "Time Management", "Microsoft Office", "Communication", "Meeting Facilitation"],
    "hr": ["Interviewing", "Employee Relations", "Conflict Resolution", "Onboarding", "Empathy", "Cultural Awareness"],

    // General / Soft Skills Triggers
    "lead": ["Leadership", "Mentoring", "Delegation", "Strategic Thinking", "Feedback Delivery"],
    "team": ["Collaboration", "Teamwork", "Empathy", "Conflict Resolution", "Psychological Safety Creation"],
    "communicat": ["Verbal Communication", "Written Communication", "Active Listening", "Public Speaking", "Nonverbal Communication"],
    "project": ["Project Management", "Agile", "Scrum", "Time Management", "Goal Setting"],
    "analy": ["Data Analysis", "Critical Thinking", "Problem Solving", "Research Skills", "Attention to Detail"],
    "design": ["Creativity", "UI/UX Design", "Graphic Design", "Presentation Design", "Adversity Quotient"],

    // Life & General Contexts
    "student": ["Time Management", "Study Skills", "Research", "Digital Skills", "Adaptability"],
    "entry": ["Learner Mindset", "Adaptability", "Communication", "Teamwork", "Reliability"],
    "remote": ["Remote Collaboration", "Time Management", "Digital Hygiene", "Self-Motivation", "Zoom/Teams Proficiency"]
};

export const searchGlobalSkills = async (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
    return GLOBAL_SKILLS.filter(skill => skill.toLowerCase().includes(lowerQuery));
};

export const getSuggestedSkills = (experiences = [], education = []) => {
    const suggestions = new Set();

    // Helper to extract keywords from text and find matches
    const analyzeText = (text) => {
        if (!text) return;
        const lowerText = text.toLowerCase();

        Object.keys(KEYWORD_MAPPINGS).forEach(keyword => {
            if (lowerText.includes(keyword)) {
                KEYWORD_MAPPINGS[keyword].forEach(skill => suggestions.add(skill));
            }
        });
    };

    // Analyze Experiences (Job Titles & Descriptions)
    experiences.forEach(exp => {
        analyzeText(exp.jobTitle);
        analyzeText(exp.description);
    });

    // Analyze Education (Degree & Field of Study)
    education.forEach(edu => {
        analyzeText(edu.degree);
        analyzeText(edu.field_of_study);
    });

    return Array.from(suggestions);
};
