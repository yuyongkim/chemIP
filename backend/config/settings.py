import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API Keys (Loaded from .env)
    KOSHA_SERVICE_KEY_ENCODED = os.getenv("KOSHA_SERVICE_KEY_ENCODED", "")
    KOSHA_SERVICE_KEY_DECODED = os.getenv("KOSHA_SERVICE_KEY_DECODED", "")
    
    # Default to Decoded for requests library, but keep Encoded just in case
    KOSHA_SERVICE_KEY = KOSHA_SERVICE_KEY_DECODED
    
    KOSHA_API_URL = "https://msds.kosha.or.kr/openapi/service/msdschem"
    
    # KIPRIS API
    KIPRIS_API_KEY = os.getenv("KIPRIS_API_KEY", "")
    KIPRIS_API_URL = "http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getWordSearch"

settings = Settings()
