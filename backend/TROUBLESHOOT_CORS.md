# 🔧 CORS Troubleshooting Guide

## Current Issue
```
Access to fetch at 'http://backend-url/api/auth/register' from origin 'http://frontend-url' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🚀 Quick Fixes to Try

### 1. Redeploy Backend with Updated CORS Configuration
The server.js has been updated with more robust CORS handling. Redeploy the backend:

1. **Commit and push changes**:
   ```bash
   git add .
   git commit -m "Fix CORS configuration"
   git push origin main
   ```

2. **In Dokploy**: Trigger a rebuild of the backend application

### 2. Verify Backend is Running
Check these URLs in your browser:

- **Health check**: `http://your-backend-url.traefik.me/health`
- **CORS test**: `http://your-backend-url.traefik.me/api/cors-test`
- **Root endpoint**: `http://your-backend-url.traefik.me/`

All should return JSON responses without errors.

### 3. Test CORS Manually
Use this curl command to test CORS:

```bash
curl -X OPTIONS \
  -H "Origin: http://your-frontend-url.traefik.me" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  http://your-backend-url.traefik.me/api/auth/register
```

You should see CORS headers in the response.

### 4. Check Docker Logs
In Dokploy, check the backend container logs for:
- Server startup messages
- CORS-related logs
- Any error messages

Look for these log messages:
```
🚀 Servidor corriendo en el puerto 5000
📡 Environment: production
🌐 CORS: Enabled for all origins
```

### 5. Environment Variables Check
Ensure these environment variables are set in Dokploy:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongodb:27017/autocontrol-sanitario
JWT_SECRET=your_secure_jwt_secret
```

### 6. Network Configuration
Verify that:
- Backend container is exposing port 5000
- Traefik is properly routing to the backend
- No firewall blocking the requests

## 🧪 Testing Script

Run the CORS test script:

```bash
# In the backend directory
npm install axios  # if not already installed
BACKEND_URL=http://your-backend-url.traefik.me node test-cors.js
```

## 🔍 Advanced Debugging

### Check Container Status
```bash
docker ps | grep backend
docker logs container-name
```

### Test Internal Network
```bash
# From within the Docker network
curl http://backend-container:5000/health
```

### Verify Traefik Configuration
Check if Traefik is properly configured to route to your backend service.

## 🆘 If Nothing Works

### Temporary Workaround
If CORS continues to fail, you can temporarily disable CORS in the browser for testing:

**Chrome**: Start with `--disable-web-security --user-data-dir=/tmp/chrome_dev_test`

⚠️ **WARNING**: Only use this for testing, never in production!

### Alternative: Use Proxy
Configure the frontend to proxy API requests through the same domain to avoid CORS entirely.

## 📞 Next Steps

1. **Redeploy backend** with the updated CORS configuration
2. **Test the health endpoints** to ensure the backend is running
3. **Check the browser network tab** to see the actual HTTP requests and responses
4. **Review Docker logs** for any startup errors

The updated CORS configuration should resolve the issue. If problems persist, the issue might be with the deployment configuration rather than the CORS setup.