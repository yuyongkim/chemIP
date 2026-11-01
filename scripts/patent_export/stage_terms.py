"""Stage 1: build terms.json / substances.json / terms_report.json under config.TERMS_DIR."""
import config
import terms


def run():
    conn = terms.open_ro(config.TERMS_DB)
    term_to_cas, substances, report = terms.build(conn)
    terms.write(term_to_cas, substances, report)
    print({k: v for k, v in report.items() if k != "ambiguous_examples"})
