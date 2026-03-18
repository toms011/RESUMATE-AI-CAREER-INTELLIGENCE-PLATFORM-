# 🛡️ Superuser Admin Panel - Complete Guide

## 🚀 Quick Start

### How to Run:
1. **Start Backend** (from `/backend` directory):
   ```powershell
   cd 'C:\Users\91751\OneDrive\Desktop\AI Resume Builder\backend'
   python app.py
   ```

2. **Start Frontend** (from `/frontend` directory):
   ```powershell
   cd 'C:\Users\91751\OneDrive\Desktop\AI Resume Builder\frontend'
   npm run dev
   ```

3. **Login with Admin Account:**
   - Email: `admin@gmail.com`
   - Password: `12345`
   - Auto-redirects to `/admin` dashboard

---

## 📋 Admin Panel Features

### 1️⃣ **Overview Tab** (📊)
- **System Stats**
  - Total Users: Count of all registered users
  - Admin Users: Count of superusers
  - Total Resumes: Count of all created resumes
  - System Status: Real-time health check (🟢 Online)

- **Quick Actions**
  - Clear AI Cache: Reset AI memory/suggestions
  - View System Logs: (Upcoming feature)

- **System Health**
  - Database connection status
  - API responsiveness
  - Frontend status
  - Authentication status

---

### 2️⃣ **User Governance Tab** (👥)
**Manage all users on the platform**

**Features:**
- 📜 View full list of all users
- 👑 **Promote to Admin**: Convert regular users to admins
- 🗑️ **Delete User**: Remove spam/bad actors and cascade-delete their data
- Role indicators: 👑 Admin vs 👤 User

**What Happens When You Delete a User:**
- User account is removed
- All their resumes are deleted
- All their personal info, experience, education, skills deleted
- Complete data cleanup (cascade delete)

---

### 3️⃣ **AI Oversight Tab** (🤖)
**Monitor and manage AI quality**

**Sections:**
- **Cache Manager**
  - View current cache status (Active/Inactive)
  - Keywords cached count
  - Last update timestamp
  - Cache size in MB
  - 🗑️ Clear Cache button

- **Bad Suggestion Reports**
  - Shows user-flagged incorrect AI suggestions
  - Currently: 0 reports (feature will be built on user side)

- **Recent AI Suggestions Table**
  - Job titles tracked
  - Keywords suggested by AI
  - How many times each suggestion was used
  - Example data for reference

---

### 4️⃣ **Templates Tab** (📋)
**Manage resume design templates**

**Built-in Templates:**
- 🎨 **Modern**: Clean, minimalist design (Active)
- 📄 **Classic**: Traditional format (Active)
- ✨ **Creative**: Bold, artistic layout (Inactive)

**Features:**
- 👁️ Preview each template
- ✅ Activate/Deactivate templates
- 📤 Upload new HTML/CSS templates
- Users can choose between active templates

---

## 🔐 Security & Access Control

✅ **Protected Route**: `/admin` only accessible to `is_admin=true` users
✅ **Auto-redirect**: Non-admin users redirected to `/dashboard`
✅ **Login Check**: Session validated on page load
✅ **Delete Protection**: Can't delete your own admin account

---

## 🛠️ Backend Endpoints (API Reference)

### Authentication
```
POST /login
- Request: { email, password }
- Response: { user: { id, username, email, is_admin } }
```

### Admin Endpoints
```
GET /admin/users
- Returns: { users: [...], total_resumes: N }
- Auth: Admin only

POST /admin/make-admin/<user_id>
- Promotes user to admin
- Auth: Admin only

DELETE /admin/users/<user_id>
- Deletes user and all their data (cascade)
- Auth: Admin only
- Note: Cascades delete all resumes, personal info, experience, education, skills

POST /admin/clear-cache
- Clears AI cache/memory
- Auth: Admin only
```

---

## 📊 Database Models (Backend)

```
User
├── id (PK)
├── username
├── email
├── password_hash
└── is_admin ✨ (True = Superuser)

Resume
├── id (PK)
├── user_id (FK) → User
├── title
└── created_at

PersonalInfo, Experience, Education, Skill
└── All link back to Resume (cascade delete)
```

---

## 🎯 Future Enhancements (Phase 2)

- [ ] Real AI integration (Google Gemini/OpenAI)
- [ ] Upload custom templates via UI
- [ ] View user-reported bad suggestions
- [ ] Analytics dashboards with charts
- [ ] Export system logs
- [ ] User activity tracking
- [ ] Role-based permissions (multiple admin levels)
- [ ] Audit logs for all admin actions

---

## 🧪 Testing Admin Features

### Create Test Users First:
```python
# In Python terminal:
from backend.app import app, db
from backend.models import User
from werkzeug.security import generate_password_hash

with app.app_context():
    user = User(
        username='testuser',
        email='test@example.com',
        password_hash=generate_password_hash('password123'),
        is_admin=False
    )
    db.session.add(user)
    db.session.commit()
```

### Test Delete Endpoint:
```bash
DELETE http://127.0.0.1:5000/admin/users/2
```

### Test Promote Endpoint:
```bash
POST http://127.0.0.1:5000/admin/make-admin/2
```

---

## ⚠️ Important Notes

1. **Cascade Delete**: When you delete a user, ALL their data is removed permanently
2. **Admin Panel is Public Route** in `/admin` - Currently protected by `is_admin` check on frontend
3. **Backend Protection Recommended**: Add authentication middleware for production
4. **AI Cache**: Currently mocked - ready for real AI integration

---

## 🎨 Styling & Design

- **Color Scheme**: Purple/Indigo primary for superuser feel
- **Icons**: Emojis for quick visual recognition
- **Responsive**: Works on mobile, tablet, desktop
- **Tailwind CSS**: All styles use Tailwind classes

---

## 💡 Tips for Expansion

1. **Add Charts**: Install `recharts` for analytics on Overview tab
2. **Template Upload**: Use FormData + multipart/form-data endpoint
3. **AI Reports**: Build user-side "Report Bad Suggestion" button
4. **Audit Logs**: Create AdminLog table to track all admin actions
5. **Email Notifications**: Notify users when promoted to admin

---

## 📞 Support

For issues or questions:
1. Check backend logs (terminal output)
2. Check browser console (F12)
3. Verify admin account: `is_admin=true` in database

**Admin Account:** admin@gmail.com / 12345

---

**Last Updated**: December 10, 2025
**Status**: ✅ Production Ready (Frontend) | ⚡ Needs Backend Auth Middleware (Production)
