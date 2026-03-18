from app import app, db, User

with app.app_context():
    # Check if target email already exists
    existing = User.query.filter_by(email='admin@gmail.com').first()
    if existing:
        print("User with email 'admin@gmail.com' already exists. Cannot update.")
    else:
        user = User.query.filter_by(email='aa@gmail.com').first()
        if user:
            user.email = 'admin@gmail.com'
            db.session.commit()
            print(f"Successfully changed email to 'admin@gmail.com' for user ID {user.id}")
        else:
            print("User 'aa@gmail.com' not found.")
