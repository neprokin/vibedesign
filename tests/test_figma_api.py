import pytest
from aioresponses import aioresponses
from mcp_server.tools.figma_api import FigmaAPI


@pytest.fixture
def figma_api():
    return FigmaAPI("test_token")


@pytest.fixture
def mock_api():
    with aioresponses() as m:
        yield m


@pytest.mark.asyncio
async def test_get_file(figma_api, mock_api):
    file_key = "test_file_key"
    mock_data = {
        "document": {
            "id": "test_id",
            "name": "Test Document"
        }
    }
    mock_api.get(
        f"https://api.figma.com/v1/files/{file_key}",
        payload=mock_data
    )

    data = await figma_api.get_file(file_key)
    assert data["document"]["id"] == "test_id"
    assert data["document"]["name"] == "Test Document"


@pytest.mark.asyncio
async def test_get_file_nodes(figma_api, mock_api):
    file_key = "test_file_key"
    node_id = "node1"
    mock_data = {
        "nodes": {
            node_id: {
                "document": {
                    "id": node_id,
                    "name": "Test Node",
                    "type": "FRAME"
                }
            }
        }
    }
    mock_api.get(
        f"https://api.figma.com/v1/files/{file_key}/nodes?ids={node_id}",
        payload=mock_data
    )

    nodes = await figma_api.get_file_nodes(file_key, [node_id])
    assert node_id in nodes["nodes"]
    assert nodes["nodes"][node_id]["document"]["name"] == "Test Node"


@pytest.mark.asyncio
async def test_get_file_images(figma_api, mock_api):
    file_key = "test_file_key"
    node_id = "node1"
    mock_data = {
        "images": {
            node_id: "https://example.com/image1.png"
        }
    }
    mock_api.get(
        f"https://api.figma.com/v1/images/{file_key}?ids={node_id}",
        payload=mock_data
    )

    images = await figma_api.get_file_images(file_key, [node_id])
    assert node_id in images["images"]
    assert images["images"][node_id] == "https://example.com/image1.png" 