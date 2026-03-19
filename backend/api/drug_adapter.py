"""Backward-compatible alias — delegates entirely to MFDSClient."""

from backend.api.mfds_client import MFDSClient


class DrugAdapter(MFDSClient):
    """Legacy adapter kept for import compatibility.

    All logic now lives in :class:`MFDSClient`.
    """

    pass
