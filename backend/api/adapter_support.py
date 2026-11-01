"""Shared pieces for the JSON REST adapters (ECHA, CompTox): last_error tracking, guarded calls, list coercion.

Every adapter used to repeat the same try/except ladder (Timeout → ConnectionError → Exception) and the same
``data if isinstance(data, list) else [data] if data else []``. They now call these helpers; the returned
dicts and the ``last_error`` strings are exactly what the adapters returned before.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

import requests


def as_list(data: Any) -> list:
    """A JSON list stays a list, a single object becomes [object], empty/None becomes []."""
    return data if isinstance(data, list) else [data] if data else []


def error_result(message: str) -> dict[str, str]:
    return {"status": "error", "message": message}


class ErrorTrackingMixin:
    """``last_error`` bookkeeping plus ``_guarded`` for one upstream call.

    Subclasses set ``_error_label`` (e.g. "ECHA"); warnings go to the subclass module's logger, as before.
    """

    _error_label = "API"
    last_error: str | None = None

    def _logger(self) -> logging.Logger:
        return logging.getLogger(type(self).__module__)

    def _clear_error(self) -> None:
        self.last_error = None

    def _set_error(self, message: str) -> None:
        self.last_error = message
        self._logger().warning("%s API issue: %s", self._error_label, message)

    def _guarded(
        self,
        call: Callable[[], dict[str, Any]],
        *,
        timeout_message: str | None = None,
        connection_prefix: str | None = None,
        failure_log: tuple | None = None,
    ) -> dict[str, Any]:
        """Run ``call()``; turn exceptions into ``{"status": "error", ...}``.

        timeout_message:   when given, requests.Timeout → that message (last_error "Request timeout").
        connection_prefix: when given, requests.ConnectionError → "<prefix> connection error: <exc>".
        failure_log:       (msg, *args) logged with logger.exception for any other exception.
        """
        try:
            return call()
        except Exception as exc:
            if timeout_message is not None and isinstance(exc, requests.Timeout):
                self._set_error("Request timeout")
                return error_result(timeout_message)
            if connection_prefix is not None and isinstance(exc, requests.ConnectionError):
                self._set_error(f"Connection error: {exc}")
                return error_result(f"{connection_prefix} connection error: {exc}")
            self._set_error(f"Unexpected error: {exc}")
            if failure_log:
                self._logger().exception(*failure_log)
            return error_result(str(exc))
