import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import toast from 'react-hot-toast';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

function TrashResumes() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [trashResumes, setTrashResumes] = useState([]);
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
            fetchTrashResumes(foundUser.id);
        } else {
            navigate('/login');
        }
    }, []);

    const fetchTrashResumes = async (userId) => {
        try {
            setLoading(true);
            const response = await api.get('/resumes/trash');
            setTrashResumes(response.data.resumes);
        } catch (error) {
            console.error("Error fetching trash resumes:", error);
            toast.error("Failed to load trash items");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (resumeId) => {
        try {
            await api.patch(`/resumes/${resumeId}/restore`);
            toast.success("Resume restored successfully!");
            // Remove from the local list immediately
            setTrashResumes(prev => prev.filter(r => r.id !== resumeId));
        } catch (error) {
            console.error("Error restoring resume:", error);
            toast.error("Failed to restore resume");
        }
    };

    if (!user) return <LoadingSpinner message="Loading trash…" />;

    return (
        <Layout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        ⊘ Trash Can
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Deleted resumes appear here. Restore them if you need them back.
                    </p>
                </div>
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium border border-red-100 table-cell">
                    Items in Trash: {trashResumes.length}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading trash items...</div>
            ) : trashResumes.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-slate-200">
                    <div className="text-6xl mb-4 text-slate-300">⊘</div>
                    <p className="text-slate-500 text-lg">Your trash is empty.</p>
                    <p className="text-slate-400 text-sm">Great job keeping things tidy!</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-6 text-blue-600 font-medium hover:text-blue-800 hover:underline"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trashResumes.map((resume) => (
                        <div key={resume.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm opacity-75 hover:opacity-100 transition-opacity relative">
                            <div className="h-32 bg-slate-100 rounded-xl mb-4 flex items-center justify-center text-5xl grayscale">
                                ▤
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-lg text-slate-800 mb-1 truncate" title={resume.title}>{resume.title}</h4>
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    ▦ Deleted: {new Date(resume.deleted_at).toLocaleDateString()}
                                </p>
                            </div>

                            <button
                                onClick={() => handleRestore(resume.id)}
                                className="w-full bg-green-50 text-green-700 border border-green-200 py-2.5 rounded-lg text-sm font-bold hover:bg-green-100 hover:border-green-300 transition-all flex items-center justify-center gap-2"
                            >
                                <span>↻</span> Restore Resume
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    );
}

export default TrashResumes;
