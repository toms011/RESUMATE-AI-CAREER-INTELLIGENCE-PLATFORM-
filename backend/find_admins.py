from app import app, db, User

with app.app_context():
    admins = User.query.filter_by(is_admin=True).all()
    if admins:
        print(f"Found {len(admins)} admin(s):")
        for a in admins:
            print(f"ID: {a.id}, Username: {a.username}, Email: {a.email}")
    else:
        print("No admin users found.")
