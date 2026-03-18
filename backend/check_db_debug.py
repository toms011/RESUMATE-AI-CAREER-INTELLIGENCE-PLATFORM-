
from app import app, db, User
with app.app_context():
    users = User.query.all()
    print(f"Total users: {len(users)}")
    for u in users:
        print(f"User: {u.id}, {u.username}, {u.email}")
