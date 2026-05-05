# FinMatrix Test Credentials

## Backend Deployment
- **Base URL:** `https://finmatrix-api-830293a85dd8.herokuapp.com/api/v1`
- **Swagger Docs:** Disabled in production (SWAGGER_ENABLED=false)

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | waleedhassansfd@gmail.com | 123456 |
| Delivery Personnel #1 | saim@metromatrix.com | 123456 |
| Delivery Personnel #2 | haseeb@metromatrix.com | 123456 |

## Important Notes

### Heroku Free Tier
- Heroku free tier sleeps after ~30 minutes of inactivity
- First request after idle may take 10-15 seconds to wake up the dyno
- Subsequent requests will be fast until the next sleep period

### CORS Configuration
If testing from localhost, the backend team needs to add:
```
http://localhost:5173
```
to the `CORS_ORIGINS` environment variable.

### Swagger Access
- Swagger is disabled in production (`SWAGGER_ENABLED=false`)
- Use the master API specification document for endpoint reference
- Test endpoints directly via the frontend or tools like Postman/Insomnia

## Testing Checklist

1. **Admin Login**
   - Email: waleedhassansfd@gmail.com
   - Password: 123456
   - Verify: Access to Admin Dashboard, Delivery Assignment, Inventory Approval

2. **Delivery Personnel Login**
   - Email: saim@metromatrix.com (or haseeb@metromatrix.com)
   - Password: 123456
   - Verify: Access to DP Dashboard, Delivery List, Bill Photo Capture

3. **Auth Flow**
   - Sign in → Verify token storage in Redux
   - Sign out → Verify tokens cleared
   - App restart → Verify persist rehydration works

4. **Network Calls**
   - Check browser DevTools Network tab for API calls
   - Verify Authorization header is present
   - Verify X-Company-Id header is present

5. **Error Handling**
   - Test with invalid credentials → Should show error
   - Test with expired token → Should auto-refresh
   - Test with network issues → Should show appropriate error messages
