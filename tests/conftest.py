import pytest
import asyncio
from unittest.mock import AsyncMock
import sys
import os

# Add the app directory to the Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db.session import get_db


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_db():
    """Mock database session for testing."""
    db = AsyncMock()
    # Mock the begin method to return an async context manager
    mock_transaction = AsyncMock()
    db.begin.return_value.__aenter__ = AsyncMock(return_value=mock_transaction)
    db.begin.return_value.__aexit__ = AsyncMock(return_value=None)
    return db


@pytest.fixture(autouse=True)
def mock_env_vars():
    """Mock environment variables for testing."""
    os.environ['SECRET_KEY'] = 'test-secret-key-for-jwt-tokens'
    os.environ['ALGORITHM'] = 'HS256'
    os.environ['DB_USER'] = 'test_user'
    os.environ['DB_PASSWORD'] = 'test_password'
    os.environ['DB_HOST'] = 'localhost'
    os.environ['DB_PORT'] = '3306'
    os.environ['DB_NAME'] = 'test_db'


@pytest.fixture
def sample_device_data():
    """Sample device data for testing."""
    return {
        'device_type': 'pos_terminal',
        'device_name': 'Test Terminal',
        'fingerprint': 'test-device-fingerprint-123',
        'settings': {
            'theme': 'light',
            'language': 'en',
            'layout': 'grid'
        }
    }


@pytest.fixture
def sample_order_data():
    """Sample order data for testing."""
    return {
        'external_id': 'TEST-001',
        'sales_channel': 'in-house',
        'subtotal': 25.98,
        'tax': 2.60,
        'discount': 0.0,
        'total': 28.58,
        'items': [
            {
                'menu_item_id': 1,
                'quantity': 2,
                'unit_price': 12.99,
                'instructions': 'Extra spicy'
            }
        ]
    }


@pytest.fixture
def sample_employee_data():
    """Sample employee data for testing."""
    return {
        'employee_id': 1,
        'username': 'testuser',
        'password_hash': 'hashed_password',
        'role_id': 2,
        'is_active': True
    }


# Test configuration for pytest-asyncio
pytest_plugins = ["pytest_asyncio"]
