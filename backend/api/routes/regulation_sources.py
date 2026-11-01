"""One shared instance of every regulatory source adapter used by the /api/regulations routes.

regulations.py re-binds these under its own module names (_echa, _comptox, ...) so tests that monkeypatch
``regulations._echa`` keep working for the aggregated endpoints defined there.
"""
from __future__ import annotations

from backend.api.comptox_adapter import CompToxAdapter
from backend.api.echa_adapter import EchaAdapter
from backend.api.handlers_adapter import HandlingSiteAdapter
from backend.api.kischem_adapter import KischemAdapter
from backend.api.kotra_adapter import KotraAdapter
from backend.api.ncis_adapter import NcisAdapter
from backend.api.niosh_adapter import NioshAdapter

echa = EchaAdapter()
comptox = CompToxAdapter()
niosh = NioshAdapter()
kischem = KischemAdapter()
ncis = NcisAdapter()
handlers = HandlingSiteAdapter()
kotra = KotraAdapter()
