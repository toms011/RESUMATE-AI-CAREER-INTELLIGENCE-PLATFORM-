import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from models import db, Template
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models import User

template_routes = Blueprint('template_routes', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png'}
MAX_BG_SIZE = 5 * 1024 * 1024  # 5 MB


def _is_admin(user_id):
    user = User.query.get(int(user_id))
    return user and user.is_admin


def _allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


# ─── Public: Get all active templates ─────────────────────────────────────────
@template_routes.route('/templates', methods=['GET'])
def get_templates():
    templates = Template.query.filter_by(is_active=True).all()
    return jsonify([t.to_dict() for t in templates]), 200


# ─── Admin: Upload background image for a DESIGN template ─────────────────────
@template_routes.route('/templates/upload-background', methods=['POST', 'OPTIONS'])
def upload_background():
    if request.method == 'OPTIONS':
        return '', 204
    verify_jwt_in_request()
    if not _is_admin(get_jwt_identity()):
        return jsonify({'error': 'Admin access required'}), 403

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not _allowed_image(file.filename):
        return jsonify({'error': 'Only JPG and PNG images are allowed'}), 400

    file_bytes = file.read()
    if len(file_bytes) > MAX_BG_SIZE:
        return jsonify({'error': 'Image exceeds 5 MB limit'}), 400

    upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'template_bg')
    os.makedirs(upload_dir, exist_ok=True)

    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_name = f"bg_{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(upload_dir, unique_name)

    with open(save_path, 'wb') as f:
        f.write(file_bytes)

    url = f"/uploads/template_bg/{unique_name}"
    return jsonify({'url': url}), 201


# ─── Admin: Create new template ────────────────────────────────────────────────
@template_routes.route('/templates', methods=['POST', 'OPTIONS'])
def create_template():
    if request.method == 'OPTIONS':
        return '', 204
    verify_jwt_in_request()
    if not _is_admin(get_jwt_identity()):
        return jsonify({'error': 'Admin access required'}), 403

    data = request.json
    template_type = data.get('template_type', 'ATS')

    new_template = Template(
        name=data.get('name', 'New Template'),
        description=data.get('description', ''),
        preview_image=data.get('preview_image', ''),
        html_template=data.get('html_template', ''),
        section_order=data.get('section_order', []),
        styles=data.get('styles', {}),
        is_active=data.get('is_active', True),
        template_type=template_type,
        background_image=data.get('background_image') if template_type == 'DESIGN' else None,
        content_padding=data.get('content_padding', {'top': 15, 'left': 18, 'right': 18, 'bottom': 15}),
    )

    db.session.add(new_template)
    db.session.commit()
    return jsonify(new_template.to_dict()), 201


# ─── Admin: Update template ────────────────────────────────────────────────────
@template_routes.route('/templates/<int:id>', methods=['PUT', 'OPTIONS'])
def update_template(id):
    if request.method == 'OPTIONS':
        return '', 204
    verify_jwt_in_request()
    if not _is_admin(get_jwt_identity()):
        return jsonify({'error': 'Admin access required'}), 403

    template = Template.query.get_or_404(id)
    data = request.json

    template.name = data.get('name', template.name)
    template.description = data.get('description', template.description)
    template.preview_image = data.get('preview_image', template.preview_image)
    if 'section_order' in data:
        template.section_order = data['section_order']
    if 'styles' in data:
        template.styles = data['styles']
    if 'is_active' in data:
        template.is_active = data['is_active']
    if 'template_type' in data:
        template.template_type = data['template_type']
    if 'background_image' in data:
        template.background_image = data['background_image']
    if 'content_padding' in data:
        template.content_padding = data['content_padding']

    db.session.commit()
    return jsonify(template.to_dict()), 200


# ─── Admin: Soft-delete template ───────────────────────────────────────────────
@template_routes.route('/templates/<int:id>', methods=['DELETE', 'OPTIONS'])
def delete_template(id):
    if request.method == 'OPTIONS':
        return '', 204
    verify_jwt_in_request()
    if not _is_admin(get_jwt_identity()):
        return jsonify({'error': 'Admin access required'}), 403

    template = Template.query.get_or_404(id)
    template.is_active = False
    db.session.commit()
    return jsonify({'message': 'Template deactivated'}), 200


# ─── Public: Get specific template ─────────────────────────────────────────────
@template_routes.route('/templates/<int:id>', methods=['GET'])
def get_template(id):
    template = Template.query.get_or_404(id)
    return jsonify(template.to_dict()), 200
