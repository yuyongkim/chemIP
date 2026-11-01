"""Append-only timestamped log lines under config.LOG_DIR (also echoed to stdout)."""
import time

import config


def log(stage, msg):
    config.LOG_DIR.mkdir(parents=True, exist_ok=True)
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} [{stage}] {msg}"
    print(line, flush=True)
    with open(config.LOG_DIR / f"{stage}.log", "a", encoding="utf-8") as f:
        f.write(line + "\n")
