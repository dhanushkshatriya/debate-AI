import os
import firebase_admin
from firebase_admin import credentials, firestore, auth

# Create a mock client if credentials are not provided (so the app doesn't crash on startup)
class MockFirestoreClient:
    def __getattr__(self, name):
        def method(*args, **kwargs):
            raise Exception("Firebase Admin is not configured. Please set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CREDENTIALS_PATH in .env")
        return method

db = MockFirestoreClient()

# Initialize Firebase Admin
firebase_cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "").strip()

try:
    if firebase_cred_path and os.path.exists(firebase_cred_path):
        cred = credentials.Certificate(firebase_cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    else:
        # Try default init (e.g., GCP environment or GOOGLE_APPLICATION_CREDENTIALS)
        if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or firebase_admin._apps:
            if not firebase_admin._apps:
                firebase_admin.initialize_app()
            db = firestore.client()
        else:
            print("WARNING: Firebase credentials not found. Database features will not work.")
except Exception as e:
    print(f"ERROR: Failed to initialize Firebase Admin client: {e}")
