
// Simulated extensive dataset
const COMPANIES = [
    "Google", "Google India Pvt Ltd", "Microsoft", "Microsoft India", "Amazon", "Amazon Web Services",
    "Facebook", "Meta", "Apple", "Netflix", "Tesla", "SpaceX", "Twitter", "X", "LinkedIn",
    "Adobe", "Oracle", "Salesforce", "IBM", "Intel", "AMD", "Nvidia", "Samsung", "LG", "Sony",
    "Tata Consultancy Services", "TCS", "Infosys", "Wipro", "HCL Technologies", "Tech Mahindra",
    "Accenture", "Capgemini", "Cognizant", "Deloitte", "PwC", "KPMG", "EY", "McKinsey & Company",
    "Boston Consulting Group", "Bain & Company", "Goldman Sachs", "JPMorgan Chase", "Morgan Stanley",
    "IIM Bangalore", "IIM Ahmedabad", "IIM Calcutta", "IIM Kozhikode", "IIT Bombay", "IIT Delhi",
    "Harvard University", "Stanford University", "MIT", "Oxford University", "Cambridge University",
    "Uber", "Airbnb", "DoorDash", "Flipkart", "Myntra", "Swiggy", "Zomato", "Paytm", "PhonePe",
    "Reliance Industries", "Bharti Airtel", "Jio"
];

export const searchCompanies = async (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return COMPANIES.filter(company => company.toLowerCase().includes(lowerQuery));
};
