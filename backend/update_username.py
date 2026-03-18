from app import app, db, User

with app.app_context():
    user = User.query.filter_by(email='admin@gmail.com').first()
    if user:
        user.username = 'Admin'
        db.session.commit()
        print(f"Successfully changed username to 'Admin' for user {user.email}")
    else:
        print("User 'admin@gmail.com' not found.")
