from app import app, db, User

with app.app_context():
    user = User.query.filter_by(email='aa@gmail.com').first()
    if user:
        user.is_admin = True
        db.session.commit()
        print(f"User {user.email} promoted to ADMIN.")
    else:
        print("User not found.")
