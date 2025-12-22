# Deployment Guide

This guide covers deploying the Rule Engine application with Django backend on Railway and React frontend on Vercel.

## Backend Deployment (Railway)

### 1. Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select the `ruleengine-extensibility` repository
4. Railway will automatically detect the Django app

### 2. Configure Environment Variables

In the Railway dashboard, add these environment variables:

```
SECRET_KEY=your-secure-random-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app
WEBHOOK_BASE_URL=https://your-app.railway.app
```

**Note:** Replace `your-app` with your actual Railway app name.

To generate a secure SECRET_KEY, run:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Get Your Railway URL

After deployment, Railway will provide a URL like:
- `https://your-app.railway.app`

Save this URL - you'll need it for the frontend configuration.

## Frontend Deployment (Vercel)

### 1. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project" → "Import Git Repository"
3. Select the `ruleengine-extensibility` repository
4. Configure the project:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

### 2. Configure Environment Variables

In the Vercel project settings, add this environment variable:

```
REACT_APP_API_URL=https://your-app.railway.app/api
```

**Important:** Replace `your-app.railway.app` with your actual Railway backend URL.

### 3. Redeploy

After adding the environment variable, trigger a new deployment in Vercel.

### 4. Get Your Vercel URL

Vercel will provide a URL like:
- `https://your-project.vercel.app`

## Update Backend CORS Settings

Once you have your Vercel frontend URL, update the Railway backend:

1. Go to your Railway project settings
2. Add the environment variable:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   ```
3. Railway will automatically redeploy with the new CORS settings

## Testing the Deployment

1. Open your Vercel frontend URL
2. Try creating a connector or viewing the dashboard
3. Check that API calls are working correctly
4. Test webhook functionality with the Railway webhook endpoints

## Local Development

To run the application locally:

### Backend
```bash
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm start
```

The frontend will use `http://localhost:8000/api` by default when `REACT_APP_API_URL` is not set.

## Troubleshooting

### Frontend can't connect to backend
- Check that `REACT_APP_API_URL` is set correctly in Vercel
- Verify the Railway backend is running
- Check browser console for CORS errors

### CORS errors
- Ensure `FRONTEND_URL` is set in Railway environment variables
- Verify the URL doesn't have a trailing slash
- Check that the frontend URL matches exactly

### Railway deployment fails
- Check build logs in Railway dashboard
- Verify all environment variables are set
- Ensure `requirements.txt` includes all dependencies

### Static files not loading on Railway
- Verify WhiteNoise is in `INSTALLED_APPS` and `MIDDLEWARE`
- Run `python manage.py collectstatic` locally to test
- Check Railway logs for static file errors
