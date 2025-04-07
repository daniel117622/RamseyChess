import os
import requests

class ChatGPTConnector:
    API_URL = "https://api.openai.com/v1/chat/completions"
    MODEL = "gpt-4"

    def __init__(self):
        api_key = os.getenv('GPT_API_KEY')
        if not api_key:
            raise EnvironmentError("GPT_API_KEY environment variable not set")

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    def send_query(self, message: str) -> str:
        payload = {
            "model": self.MODEL,
            "messages": [{"role": "user", "content": message}]
        }
        response = self.session.post(self.API_URL, json=payload)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']

