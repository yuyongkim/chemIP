class Prompts:
    SUMMARY_PROMPT = """
    다음 문서를 요약하고 핵심 기술과 화학 물질 관련 내용을 추출해주세요.
    
    문서 내용:
    {text}
    """

    RISK_ASSESSMENT_PROMPT = """
    다음 화학 물질 목록을 바탕으로 잠재적인 위험성과 규제 사항을 분석해주세요.
    
    화학 물질 목록:
    {chemicals}
    """

prompts = Prompts()
