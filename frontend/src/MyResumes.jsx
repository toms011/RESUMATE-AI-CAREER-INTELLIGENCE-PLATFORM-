import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import toast from 'react-hot-toast';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

function MyResumes() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const foundUser = JSON.parse(loggedInUser);
            if (foundUser.is_admin) {
                navigate('/admin');
                return;
            }
            setUser(foundUser);
            fetchResumes(foundUser.id);
        } else {
            navigate('/login');
        }
    }, []);

    const fetchResumes = async (userId) => {
        try {
            setLoading(true);
            const response = await api.get('/resumes');
            setResumes(response.data.resumes);
        } catch (error) {
            console.error("Error fetching resumes:", error);
            toast.error("Failed to load resumes");
        } finally {
            setLoading(false);
        }
    };

    const handleSoftDelete = async (resumeId) => {
        if (!window.confirm("Are you sure you want to move this resume to Trash?")) return;

        try {
            await api.patch(`/resumes/${resumeId}/trash`);
            toast.success("Resume moved to Trash");
            fetchResumes(user.id);
        } catch (error) {
            console.error("Error deleting resume:", error);
            toast.error("Failed to delete resume");
        }
    };

    if (!user) return <LoadingSpinner message="Loading resumes…" />;

    return (
        <Layout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        ≡ My Resumes
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage your created resumes here.
                    </p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100 table-cell">
                    Total Resumes: {resumes.length}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading your resumes...</div>
            ) : resumes.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-slate-200">
                    <div className="text-6xl mb-4 text-slate-300">✎</div>
                    <p className="text-slate-500 text-lg">You haven't created any resumes yet.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
                    >
                        Create Your First Resume
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resumes.map((resume) => (
                        <div key={resume.id} className="bg-white group hover:-translate-y-1 transition-all duration-300 p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl relative overflow-hidden">
                            <div className="h-32 bg-slate-50 rounded-xl mb-4 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-300 text-slate-300">
                                ▤
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-lg text-slate-800 mb-1 truncate" title={resume.title}>{resume.title}</h4>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                    ▦ Last updated: {new Date(resume.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate(`/build-resume/${resume.id}`)}
                                    className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                >
                                    ✎ Edit
                                </button>
                                <button
                                    className="px-4 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                                    onClick={() => handleSoftDelete(resume.id)}
                                >
                                    ⊘
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    );
}

export default MyResumes;
