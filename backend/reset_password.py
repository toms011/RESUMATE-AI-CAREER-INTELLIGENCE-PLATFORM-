from app import app, db, User
from werkzeug.security import generate_password_hash

with app.app_context():
    user = User.query.filter_by(email='aa@gmail.com').first()
    if user:
        user.password_hash = generate_password_hash('password123')
        db.session.commit()
        print(f"Password for {user.email} reset to 'password123'")
    else:
        print("User not found")
