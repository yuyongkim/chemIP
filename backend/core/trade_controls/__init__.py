"""물질별 수출입 규제(한국 기준 수입·수출 의무 + 상대국 목록) 조회 패키지. 구성은 README.md 표 참고."""

from backend.core.trade_controls.assemble import build_trade_controls

__all__ = ["build_trade_controls"]
