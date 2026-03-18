
// Simulated extensive dataset for Degrees
const DEGREES = [
    "High School Diploma", "GED", "Associate of Arts", "Associate of Science",
    "Bachelor of Arts", "Bachelor of Science", "Bachelor of Technology", "Bachelor of Engineering",
    "Bachelor of Business Administration", "Bachelor of Commerce", "Bachelor of Fine Arts",
    "Master of Arts", "Master of Science", "Master of Business Administration", "Master of Technology",
    "Master of Engineering", "Master of Commerce", "Master of Fine Arts", "Doctor of Philosophy (PhD)",
    "Doctor of Medicine (MD)", "Juris Doctor (JD)", "Diploma in Engineering", "Diploma in Business"
].sort();

// Simulated extensive dataset for Fields of Study
const MAJORS = [
    "Computer Science", "Information Technology", "Software Engineering", "Mechanical Engineering",
    "Civil Engineering", "Electrical Engineering", "Electronics", "Business Administration",
    "Marketing", "Finance", "Accounting", "Economics", "Psychology", "Sociology", "Political Science",
    "History", "English Literature", "Biology", "Chemistry", "Physics", "Mathematics", "Statistics",
    "Nursing", "Medicine", "Law", "Education", "Graphic Design", "Agriculture", "Environmental Science"
].sort();

export const searchDegrees = async (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    await new Promise(resolve => setTimeout(resolve, 50));
    return DEGREES.filter(d => d.toLowerCase().includes(lowerQuery));
};

export const searchMajors = async (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    await new Promise(resolve => setTimeout(resolve, 50));
    return MAJORS.filter(m => m.toLowerCase().includes(lowerQuery));
};
