from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

SECRET_KEY = "your_secret_key"

class AuthMiddleware(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        if credentials:
            try:
                payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
                request.state.user = payload
            except jwt.PyJWTError:
                raise HTTPException(status_code=401, detail="Invalid token")
        else:
            raise HTTPException(status_code=401, detail="Not authenticated")

# RBAC utility
ROLE_PERMISSIONS = {
    "Admin": ["update_role", "view_audit", "view_users"],
    "Manager": ["view_users"],
    "User": []
}

def check_permission(user_role, action):
    allowed = ROLE_PERMISSIONS.get(user_role, [])
    if action not in allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
