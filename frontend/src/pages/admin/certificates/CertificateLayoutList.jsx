import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { certificateApi } from '../../../services/api';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LoadingSpinner from '../../../components/LoadingSpinner';
import '../../../styles/CertificateDesigner.css';

const CertificateLayoutList = () => {
    const [layouts, setLayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadLayouts();
    }, []);

    const loadLayouts = async () => {
        try {
            const data = await certificateApi.getAll();
            setLayouts(data);
        } catch (err) {
            console.error('Error loading layouts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSetDefault = async (layout) => {
        try {
            await certificateApi.update(layout.id, {
                is_default: true,
                program_id: null
            });
            loadLayouts();
        } catch (err) {
            console.error('Error setting default layout:', err);
        }
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await certificateApi.delete(deleteId);
            setLayouts(layouts.filter(layout => layout.id !== deleteId));
        } catch (err) {
            console.error('Error deleting layout:', err);
        } finally {
            setShowConfirm(false);
            setDeleteId(null);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Loading certificates…" />;
    }

    return (
        <div className="admin-list-container">
            <div className="list-header">
                <h2>Certificate Layouts</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/certificates/new')}
                >
                    + Create New Layout
                </button>
            </div>

            {layouts.length === 0 ? (
                <div className="empty-state">
                    <p>No certificate layouts found. Create your first layout!</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Layout Name</th>
                                <th>Program</th>
                                <th>Default</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {layouts.map((layout) => (
                                <tr key={layout.id}>
                                    <td>{layout.layout_name}</td>
                                    <td>{layout.program?.program_name || 'N/A'}</td>
                                    <td>
                                        {layout.is_default ? (
                                            <span className="badge badge-success">Default</span>
                                        ) : (
                                            <span className="badge badge-secondary">—</span>
                                        )}
                                    </td>
                                    <td>{new Date(layout.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            {!layout.is_default && (
                                                <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => handleSetDefault(layout)}
                                                    title="Set as Global Default"
                                                >
                                                    Set Default
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => navigate(`/admin/certificates/edit/${layout.id}`)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(layout.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                isOpen={showConfirm}
                title="Delete Certificate Layout"
                message="Are you sure you want to delete this certificate layout? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setShowConfirm(false)}
                confirmVariant="danger"
            />
        </div>
    );
};

export default CertificateLayoutList;
