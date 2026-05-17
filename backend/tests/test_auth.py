"""
Authentication API Tests
Covers user registration and login flows.
"""
import pytest


@pytest.mark.asyncio
async def test_register_user(client):
    """
    Test user registration with valid data.
    """
    payload = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "TestPass123",
        "phone": "13800138000"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["code"] == 200
    assert "user" in data["data"]
    assert data["data"]["user"]["username"] == "testuser"
    assert data["data"]["user"]["email"] == "test@example.com"
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]


@pytest.mark.asyncio
async def test_login(client):
    """
    Test login flow: register a user first, then login.
    """
    # 1. Register a user
    register_payload = {
        "username": "logintest",
        "email": "login@example.com",
        "password": "LoginPass123"
    }
    reg_response = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg_response.status_code == 200

    # 2. Login with username
    login_payload = {
        "username": "logintest",
        "password": "LoginPass123"
    }
    login_response = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_response.status_code == 200

    data = login_response.json()
    assert data["code"] == 200
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["user"]["username"] == "logintest"


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    """
    Test registering with an already existing username returns 400.
    """
    payload = {
        "username": "duplicate",
        "email": "dup1@example.com",
        "password": "DupPass123"
    }
    response1 = await client.post("/api/v1/auth/register", json=payload)
    assert response1.status_code == 200

    # Try to register with same username but different email
    payload2 = {
        "username": "duplicate",
        "email": "dup2@example.com",
        "password": "DupPass123"
    }
    response2 = await client.post("/api/v1/auth/register", json=payload2)
    assert response2.status_code == 400


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    """
    Test login with wrong password returns 401.
    """
    # Register first
    payload = {
        "username": "badcred",
        "email": "bad@example.com",
        "password": "BadCred123"
    }
    await client.post("/api/v1/auth/register", json=payload)

    # Login with wrong password
    login_payload = {
        "username": "badcred",
        "password": "WrongPass123"
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
