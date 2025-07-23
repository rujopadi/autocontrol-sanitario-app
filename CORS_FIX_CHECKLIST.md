# 🔧 CORS Fix Checklist

## Current Status
❌ CORS error: "No 'Access-Control-Allow-Origin' header is present on the requested resource"

## ✅ Step-by-Step Fix

### 1. Deploy Updated Backend
The backend has been updated with improved CORS configuration.

**Action Required:**
```bash
# In your backend repository
git add .
git commit -m "Fix CORS configuration and add debugging"
git push origin main
```

**Then in Dokploy:**
- Go to your backend application
- Click "Deploy" or "Rebuild"
- Wait for deployment to complete

### 2. Verify Backend is Running
Test these URLs in your browser:

- **Health Check**: `http://your-backend-url.traefik.me/health`
- **CORS Test**: `http://your-backend-url.traefik.me/api/cors-test`
- **Root**: `http://your-backend-url.traefik.me/`

**Expected Response** (for health check):
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "uptime": 123.45,
  "cors": "enabled"
}
```

### 3. Update Frontend Environment Variable
In Dokploy, for your frontend application:

1. **Go to Environment Variables**
2. **Set or Update**:
   ```
   VITE_API_URL=http://your-actual-backend-url.traefik.me
   ```
3. **Rebuild the frontend**

### 4. Test CORS Manually
Use this curl command to test CORS:

```bash
curl -X OPTIONS \
  -H "Origin: http://your-frontend-url.traefik.me" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  http://your-backend-url.traefik.me/api/auth/register
```

**Expected Response Headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token
```

### 5. Check Browser Console
After deploying, check the browser console for:

1. **API URL being used**: Look for `🔗 API URL: http://...`
2. **Environment**: Look for `🌍 Environment: production`
3. **Network requests**: Check if requests are going to the correct URL

### 6. Verify Docker Logs
In Dokploy, check backend container logs for:

```
🚀 Servidor corriendo en el puerto 5000
📡 Environment: production
🌐 CORS: Enabled for all origins
📊 Health check: http://localhost:5000/health
```

## 🚨 Common Issues & Solutions

### Issue: Backend not starting
**Solution**: Check environment variables in Dokploy:
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongodb:27017/autocontrol-sanitario
JWT_SECRET=your_secure_jwt_secret
```

### Issue: Wrong API URL in frontend
**Solution**: Verify `VITE_API_URL` environment variable in frontend deployment

### Issue: Still getting CORS errors
**Solution**: 
1. Clear browser cache
2. Try in incognito/private mode
3. Check if backend is actually receiving requests (check logs)

### Issue: 404 errors
**Solution**: Verify Traefik routing is working correctly

## 🧪 Testing Steps

1. **Deploy backend** with updated CORS configuration
2. **Test health endpoint** directly in browser
3. **Update frontend** environment variable
4. **Rebuild frontend**
5. **Test registration** in the app
6. **Check browser network tab** for successful requests

## 📞 If Still Not Working

1. **Share the exact backend URL** you're using
2. **Share the frontend URL** you're using
3. **Share the browser console logs**
4. **Share the backend container logs** from Dokploy

The updated CORS configuration should resolve this issue. The key changes:
- More robust CORS middleware
- Better preflight handling
- Debugging endpoints
- Improved error handling

## 🎯 Expected Result

After following these steps, you should see:
- ✅ No CORS errors in browser console
- ✅ Successful API requests
- ✅ Working registration and login
- ✅ All app functionality working