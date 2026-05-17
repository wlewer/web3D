"""
3D Model API Tests
Covers public listing (no auth) and protected endpoints.
"""
import pytest


@pytest.mark.asyncio
async def test_list_models_unauthorized(client):
    """
    Test that the protected model list endpoint returns 401 without authentication.
    """
    response = await client.get("/api/v1/models/")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_public_models_no_auth(client):
    """
    Test that the public models endpoint is accessible without authentication.
    """
    response = await client.get("/api/v1/models/public")
    assert response.status_code == 200

    data = response.json()
    assert "data" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "total_pages" in data


@pytest.mark.asyncio
async def test_get_homepage_models_no_auth(client):
    """
    Test that the homepage models endpoint is accessible without authentication.
    """
    response = await client.get("/api/v1/models/homepage")
    assert response.status_code == 200

    data = response.json()
    assert "data" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_homepage_version_no_auth(client):
    """
    Test that the homepage version endpoint is accessible without authentication.
    """
    response = await client.get("/api/v1/models/homepage/version")
    assert response.status_code == 200

    data = response.json()
    assert "version" in data
    assert isinstance(data["version"], int)
