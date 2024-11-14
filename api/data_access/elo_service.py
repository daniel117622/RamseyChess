import requests

class EloService:
    def __init__(self, base_url="http://elo-rankings:3000"):
        self.base_url = base_url
    
    def post(self, endpoint, json=None):
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.post(url, json=json)
            response.raise_for_status()  # Raises an error for 4xx/5xx responses
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in POST request to {url}: {e}")
            return None
    
    def get(self, endpoint, params=None):
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in GET request to {url}: {e}")
            return None

