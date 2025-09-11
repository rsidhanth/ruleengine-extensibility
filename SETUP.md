# Setup & Installation Guide

Quick guide to get the Rule Engine Extensibility Framework running on your local machine.

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd rule-engine-extensibility
```

### 2. Option A: Automated Setup (Recommended)
```bash
chmod +x setup.sh
./setup.sh
```

### 2. Option B: Manual Setup

#### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py makemigrations
python manage.py migrate

# (Optional) Create admin user
python manage.py createsuperuser
```

#### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Return to root directory
cd ..
```

## Running the Application

### Start Backend Server
```bash
python manage.py runserver
```
Backend will be available at: http://localhost:8000

### Start Frontend Server (New Terminal)
```bash
cd frontend
npm install
npm start
```
Frontend will be available at: http://localhost:3000

## Access Points

- **Main Application**: http://localhost:3000
- **API Endpoints**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

## Troubleshooting

### Common Issues

1. **Port 3000/8000 in use**: Kill existing processes or change ports
2. **Module not found errors**: Run `pip install -r requirements.txt` again
3. **React build fails**: Delete `node_modules`, run `npm install`
4. **CORS errors**: Ensure API calls go to port 8000 (not 8001)

### Verify Setup

Test API connectivity:
```bash
curl http://localhost:8000/api/connectors/
```

Should return JSON response with connectors data.

### Log Files

- Django logs: Console output from `python manage.py runserver`
- React logs: Console output from `npm start`
- Browser logs: Developer Console (F12)

## Development Mode

Both servers need to run simultaneously:
- Django backend on port 8000
- React frontend on port 3000

The React app will automatically proxy API calls to the Django backend.

That's it! The application should now be running and accessible.
