# Rule Engine Extensibility Framework - Prototype

A prototype application for managing REST API connectors and credentials with a testing framework. Built with Django backend and React frontend.

## Features

### Connectors Module
- Create custom connectors for any REST API
- Configure base URL and authentication
- Define multiple actions per connector
- Support for GET, POST, PUT, PATCH, DELETE methods
- Flexible JSON configuration for query parameters, headers, and request body

### Credentials Module
- Support for multiple authentication types:
  - No Authentication
  - Basic Authentication (username/password)
  - API Key (custom header)
  - Bearer Token
- Secure credential storage (masked in API responses)
- Credential testing functionality

### Testing Framework
- Test individual connectors or specific actions
- Custom parameter/header/body override for testing
- Real-time response display with status codes and timing
- Connection test history tracking

## Tech Stack

- **Backend**: Django 4.2, Django REST Framework
- **Frontend**: React 18, Material-UI
- **Database**: SQLite (for prototype)
- **HTTP Client**: Axios (frontend), Requests (backend)

## Project Structure

```
├── rule_engine_backend/          # Django project settings
├── connectors/                   # Django app for connectors & credentials
│   ├── models.py                # Database models
│   ├── serializers.py           # REST API serializers
│   ├── services.py              # Business logic for API calls
│   ├── views.py                 # API endpoints
│   └── admin.py                 # Django admin interface
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/          # Reusable React components
│   │   ├── pages/               # Page components
│   │   └── services/            # API client
└── requirements.txt             # Python dependencies
```

## Setup Instructions

### Backend Setup

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run database migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Create superuser (optional)**:
   ```bash
   python manage.py createsuperuser
   ```

4. **Start Django development server**:
   ```bash
   python manage.py runserver
   ```

   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start React development server**:
   ```bash
   npm start
   ```

   The frontend will be available at `http://localhost:3000`

### Quick Setup Script

Alternatively, you can use the provided setup script:

```bash
chmod +x setup.sh
./setup.sh
```

## Usage Guide

### 1. Create Credentials

1. Navigate to the "Credentials" tab
2. Click "Add Credential"
3. Choose authentication type and fill in required fields
4. Test the credential (requires at least one connector using it)

### 2. Create Connectors

1. Navigate to the "Connectors" tab  
2. Click "Add Connector"
3. Provide name, description, base URL, and select a credential
4. Test the connector connection

### 3. Define Actions

1. From a connector card, click the "Manage Actions" button
2. Click "Add Action" 
3. Configure HTTP method, endpoint path, and optional JSON configurations:
   - Query Parameters: `{"param1": "value1"}`
   - Custom Headers: `{"Content-Type": "application/json"}`
   - Request Body: `{"key": "value"}` (for POST/PUT/PATCH)
4. Test individual actions

### 4. Test Connections

- Test entire connectors or specific actions
- Override default parameters with custom values during testing
- View real-time results including status codes, response times, and response data
- Check test history for debugging

## API Endpoints

### Credentials
- `GET /api/credentials/` - List all credentials
- `POST /api/credentials/` - Create credential
- `GET /api/credentials/{id}/` - Get credential details
- `PUT /api/credentials/{id}/` - Update credential
- `DELETE /api/credentials/{id}/` - Delete credential
- `POST /api/credentials/{id}/test/` - Test credential

### Connectors
- `GET /api/connectors/` - List all connectors
- `POST /api/connectors/` - Create connector
- `GET /api/connectors/{id}/` - Get connector details
- `PUT /api/connectors/{id}/` - Update connector
- `DELETE /api/connectors/{id}/` - Delete connector
- `POST /api/connectors/{id}/test/` - Test connector
- `POST /api/connectors/{id}/execute_action/` - Execute specific action

### Actions
- `GET /api/actions/?connector_id={id}` - List actions for connector
- `POST /api/actions/` - Create action
- `GET /api/actions/{id}/` - Get action details
- `PUT /api/actions/{id}/` - Update action
- `DELETE /api/actions/{id}/` - Delete action
- `POST /api/actions/{id}/test/` - Test action

### Tests
- `GET /api/tests/?connector_id={id}` - Get test history for connector

## Example Usage

### 1. JSONPlaceholder API Example

**Credential:**
- Name: "No Auth"
- Type: "No Authentication"

**Connector:**
- Name: "JSONPlaceholder"
- Base URL: "https://jsonplaceholder.typicode.com"
- Credential: "No Auth"

**Actions:**
- **Get Posts**: GET `/posts`
- **Get Post**: GET `/posts/1`
- **Create Post**: POST `/posts` with body `{"title": "Test", "body": "Test body", "userId": 1}`

### 2. GitHub API Example

**Credential:**
- Name: "GitHub Token"
- Type: "Bearer Token" 
- Bearer Token: "your_github_token_here"

**Connector:**
- Name: "GitHub API"
- Base URL: "https://api.github.com"
- Credential: "GitHub Token"

**Actions:**
- **Get User**: GET `/user`
- **List Repos**: GET `/user/repos`

## Development Notes

- This is a prototype focused on synchronous REST API calls only
- No encryption, IP whitelisting, or async/webhook support in this version
- SQLite database for simplicity (use PostgreSQL for production)
- CORS configured for localhost development
- Sensitive credential fields are masked in API responses

## Next Steps for Production

1. Add proper encryption for credentials storage
2. Implement IP whitelisting and mTLS support
3. Add async request handling and webhook support
4. Add proper user authentication and authorization
5. Switch to production database (PostgreSQL)
6. Add comprehensive logging and monitoring
7. Add input validation and rate limiting
8. Add bulk operations and import/export functionality