# CLAUDE.md — ChemIP Project Rules

## Paper Versioning (papers/acs-chs/)

- **최종본 기준:** `paper_v1.7.md` / `paper_v1.7.docx`
- **변경사항 발생 시 반드시 버전을 올려서 새 파일 생성** (e.g., v1.4 → v1.5)
  - md와 docx 모두 새 버전으로 생성
  - `CHANGELOG.md`에 변경 내용 기록
  - 이전 버전 파일은 삭제하지 않음 (이력 보존)

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
