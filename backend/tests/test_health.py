"""
Health Check Endpoint Tests
"""
import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """
    Test the /health endpoint returns 200 with expected fields.
    """
    response = await client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data
