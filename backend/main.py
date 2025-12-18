from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

print(f"LOADING BACKEND FROM: {__file__}")
print(f"CWD: {os.getcwd()}")

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.routes import chemicals, patents, trade
from backend.core.terminology_db import TerminologyDB

app = FastAPI(title="ChemIP Platform API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    traceback.print_exc()
    return HTTPException(status_code=500, detail=str(exc))

# Register Routers
app.include_router(chemicals.router, prefix="/api/chemicals", tags=["Chemicals"])
app.include_router(patents.router, prefix="/api/patents", tags=["Patents"]) # Note: patents router handles /api/patents itself, but also has /uspto and /global which might need adjustment if they were under /api/patents. 
# Looking at original main.py:
# /api/patents -> search_patents
# /api/uspto/{chem_id} -> search_uspto
# /api/global/patents/{chem_id} -> search_global_patents

# The patents.py router has:
# @router.get("") -> /api/patents (matches)
# @router.get("/uspto/{chem_id}") -> /api/patents/uspto/{chem_id} (Wait, original was /api/uspto)
# @router.get("/global/{chem_id}") -> /api/patents/global/{chem_id} (Wait, original was /api/global/patents)

# To preserve EXACT URLs:
# We should probably register patents router differently or adjust patents.py.
# However, usually grouping related endpoints under a prefix is better.
# But to avoid breaking frontend, let's keep original paths.
# Since app.include_router adds a prefix to all routes in the router.
# Original:
# /api/patents
# /api/uspto
# /api/global/patents

# Let's adjust main.py to include patents router multiple times or use a different strategy?
# Cleaner way: Let patents.py handle its internal structure, but here we can just include it with prefix="/api" if we align paths in patents.py?
# Or just keep them separate in patents.py without a common prefix in include_router, but using full paths in APIRouter?
# No, APIRouter prefixes stack.

# Re-checking patents.py I wrote:
# @router.get("") -> means prefix + ""
# @router.get("/uspto/{chem_id}") -> means prefix + "/uspto..."

# If I use app.include_router(patents.router, prefix="/api"), then:
# /api + "" -> /api (Wrong, needs to be /api/patents)
# /api + /uspto/... -> /api/uspto/... (Correct!)
# /api + /global/... -> /api/global/... (Close, original was /api/global/patents/...)

# Let's fix patents.py to align with prefix="/api" strategy which seems most common for "root" api router.
# But chemicals is under /api/chemicals.

# Let's modify patents.py slightly to match exactly if we mount it at /api. (See next tool call)
# For now, I will mount chemicals at /api/chemicals.
# And trade at /api/trade.

# For patents, I'll update patents.py in next step to have:
# @router.get("/patents")
# @router.get("/uspto/{chem_id}")
# @router.get("/global/patents/{chem_id}")
# And then mount it at /api.

app.include_router(trade.router, prefix="/api/trade", tags=["Trade"])

# DB Initialization on startup


@app.get("/")
def read_root():
    return {"message": "Welcome to ChemIP Platform API"}

