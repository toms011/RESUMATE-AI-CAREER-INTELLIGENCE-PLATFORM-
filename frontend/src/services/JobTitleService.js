
// Simulated extensive dataset
const JOB_TITLES = [
    "Software Engineer", "Senior Software Engineer", "Product Manager", "Project Manager",
    "Data Scientist", "Data Analyst", "Business Analyst", "Marketing Manager",
    "Sales Manager", "Sales Representative", "Account Manager", "Account Executive",
    "Human Resources Manager", "Recruiter", "Operations Manager", "Office Manager",
    "Administrative Assistant", "Customer Service Representative", "Graphic Designer",
    "UX Designer", "UI Designer", "Web Developer", "Frontend Developer", "Backend Developer",
    "Full Stack Developer", "DevOps Engineer", "System Administrator", "Network Engineer",
    "Cloud Architect", "Solutions Architect", "Technical Lead", "CTO", "CEO", "CFO", "COO",
    "Financial Analyst", "Investment Banker", "Attorney", "Legal Counsel", "Teacher",
    "Professor", "Research Assistant", "Registered Nurse", "Medical Assistant", "Pharmacist",
    "Physician", "Dentist", "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
    "Computer Engineer", "Computer Technician", "Computer Science Instructor", "Computer Operator",
    "Agriculture Officer", "Agricultural Engineer", "Agri Business Manager", "Farm Manager",
    "Content Writer", "Copywriter", "Social Media Manager", "SEO Specialist", "Digital Marketing Specialist"
];

// In a real app, this might fetch from an API
export const searchJobTitles = async (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay for realism

    return JOB_TITLES.filter(title => title.toLowerCase().includes(lowerQuery));
};
