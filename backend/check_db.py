from app import app, db
from sqlalchemy import inspect

with app.app_context():
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns('resume')]
    print(f"Columns in Resume table: {columns}")
    
    if 'is_deleted' in columns:
        print("✅ is_deleted column exists")
    else:
        print("❌ is_deleted column MISSING")
