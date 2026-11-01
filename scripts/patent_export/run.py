"""Thin entry point: python -I -B run.py <terms|scan|partition|shard|status|all>."""
import os
import sys

# python -I drops the script directory from sys.path; put this package directory back explicitly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config  # noqa: F401  (fail fast if config is broken)


def main(argv):
    cmd = argv[1] if len(argv) > 1 else "status"
    if cmd == "terms":
        import stage_terms; stage_terms.run()
    elif cmd == "scan":
        import stage_scan; stage_scan.run()
    elif cmd == "partition":
        import stage_partition; stage_partition.run()
    elif cmd == "shard":
        import stage_shard; stage_shard.run()
    elif cmd == "status":
        import stage_status; stage_status.run()
    elif cmd == "all":
        import stage_terms, stage_scan, stage_partition, stage_shard
        stage_terms.run(); stage_scan.run(); stage_partition.run(); stage_shard.run()
    else:
        print(__doc__); return 2
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    sys.exit(main(sys.argv))
