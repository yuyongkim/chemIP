import re
import os

class DocumentProcessor:
    def normalize_text(self, text: str) -> str:
        """
        텍스트 정규화: 불필요한 공백 제거, 소문자 변환 등
        """
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def process_file(self, file_path: str) -> str:
        """
        파일을 읽어서 텍스트로 반환 (현재는 .txt 지원)
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        _, ext = os.path.splitext(file_path)
        
        if ext.lower() == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return self.normalize_text(f.read())
        else:
            # TODO: Add support for PDF, DOCX, etc.
            raise ValueError(f"Unsupported file format: {ext}")
