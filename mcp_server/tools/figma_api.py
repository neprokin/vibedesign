import os
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class FigmaAPI:
    def __init__(self):
        self.access_token = os.getenv("FIGMA_ACCESS_TOKEN")
        self.base_url = "https://api.figma.com/v1"
        self.headers = {
            "X-Figma-Token": self.access_token
        }

    async def get_file(self, file_key: str) -> Dict[str, Any]:
        """Получение данных файла Figma"""
        response = requests.get(
            f"{self.base_url}/files/{file_key}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    async def get_file_nodes(self, file_key: str, node_ids: list[str]) -> Dict[str, Any]:
        """Получение данных конкретных узлов"""
        ids = ",".join(node_ids)
        response = requests.get(
            f"{self.base_url}/files/{file_key}/nodes?ids={ids}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    async def get_file_images(self, file_key: str, node_ids: list[str]) -> Dict[str, Any]:
        """Получение изображений для узлов"""
        ids = ",".join(node_ids)
        response = requests.get(
            f"{self.base_url}/images/{file_key}?ids={ids}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json() 