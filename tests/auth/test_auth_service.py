import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace
from app.services.auth_service import AuthService
from app.schemas.auth_dto import LoginRequest, DeviceRegistrationRequest
from app.repositories.employees_repo import EmployeeRepository
from app.repositories.devices_repo import DevicesRepository
from app.repositories.restaurants_repo import RestaurantRepository


class TestAuthService:
    @pytest.fixture
    def mock_db(self):
        return AsyncMock()

    @pytest.fixture
    def mock_repos(self, mock_db):
        """Create mock repositories"""
        employees_repo = AsyncMock(spec=EmployeeRepository)
        devices_repo = AsyncMock(spec=DevicesRepository)
        restaurant_repo = AsyncMock(spec=RestaurantRepository)

        return {
            'employees': employees_repo,
            'devices': devices_repo,
            'restaurant': restaurant_repo
        }

    @pytest.fixture
    def auth_service(self, mock_db, mock_repos):
        """Create AuthService with mocked dependencies"""
        service = AuthService(mock_db)
        # Override the repositories with mocks
        service.employees_repo = mock_repos['employees']
        return service

    @pytest.mark.asyncio
    async def test_authenticate_and_create_token_success(self, auth_service, mock_repos):
        """Test successful employee authentication"""
        # Mock employee retrieval
        mock_employee = MagicMock()
        mock_employee.employee_id = 1
        mock_employee.username = 'testuser'
        mock_employee.password_hash = 'hashed_password'
        mock_employee.restaurant_id = 1
        mock_employee.name = 'Test User'
        mock_employee.role_id = 2
        mock_repos['employees'].get_by_username.return_value = mock_employee

        # Mock restaurant repository
        mock_restaurant_repo = AsyncMock()
        mock_restaurant_repo.get_subscription_tier.return_value = 'pro'

        with (patch('app.services.auth_service.RestaurantRepository') as mock_restaurant_class,
              patch('app.services.auth_service.create_access_token') as mock_create_token,
              patch('app.services.auth_service.verify_password') as mock_verify):

            mock_restaurant_class.return_value = mock_restaurant_repo
            mock_verify.return_value = True
            mock_create_token.return_value = ('mock-jwt-token', 2592000)

            user, token, tier, expires_in = await auth_service.authenticate_and_create_token(
                'testuser',
                'correct_password'
            )

            assert user == mock_employee
            assert token == 'mock-jwt-token'
            assert tier == 'pro'
            assert expires_in == 2592000

            mock_repos['employees'].get_by_username.assert_called_once_with('testuser')
            mock_verify.assert_called_once_with('correct_password', 'hashed_password')
            mock_create_token.assert_called_once()

    @pytest.mark.asyncio
    async def test_authenticate_and_create_token_invalid_credentials(self, auth_service, mock_repos):
        """Test authentication with invalid credentials"""
        mock_repos['employees'].get_by_username.return_value = None

        user, token, tier, expires_in = await auth_service.authenticate_and_create_token('nonexistent', 'password')

        assert user is None
        assert token is None
        assert tier is None
        assert expires_in is None

    @pytest.mark.asyncio
    async def test_authenticate_and_create_token_wrong_password(self, auth_service, mock_repos):
        """Test authentication with wrong password"""
        mock_employee = MagicMock()
        mock_employee.password_hash = 'hashed_password'
        mock_repos['employees'].get_by_username.return_value = mock_employee

        with patch('app.services.auth_service.verify_password') as mock_verify:
            mock_verify.return_value = False

            user, token, tier, expires_in = await auth_service.authenticate_and_create_token('testuser', 'wrong_password')

            assert user is None
            assert token is None
            assert tier is None
            assert expires_in is None

    @pytest.mark.asyncio
    async def test_register_device_success(self, auth_service, mock_repos):
        """Test successful device registration"""
        # Mock device creation
        mock_device = MagicMock()
        mock_device.device_id = 123
        mock_device.device_type = 'pos_terminal'
        mock_device.device_fingerprint = 'test-fingerprint'

        # Mock devices repository
        mock_devices_repo = AsyncMock()
        mock_devices_repo.create.return_value = mock_device

        with (patch('app.services.auth_service.DevicesRepository') as mock_devices_class,
              patch('app.services.auth_service.create_device_token') as mock_create_token):

            mock_devices_class.return_value = mock_devices_repo
            mock_create_token.return_value = 'mock-device-token'

            result = await auth_service.register_device(
                device_name='Test Terminal',
                device_type='pos_terminal',
                device_fingerprint='test-fingerprint',
                restaurant_id=1
            )

            assert result['device_id'] == 123
            assert result['device_token'] == 'mock-device-token'
            assert result['device_type'] == 'pos_terminal'

            mock_devices_repo.create.assert_called_once()
            mock_create_token.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_activity_success(self, auth_service):
        """Test successful activity logging"""
        # Mock activity log repository
        mock_activity_repo = AsyncMock()

        with patch('app.services.auth_service.ActivityLogRepository') as mock_activity_class:
            mock_activity_class.return_value = mock_activity_repo

            await auth_service.log_activity(
                action='User Login',
                details='Test login',
                restaurant_id=1,
                employee_id=1
            )

            mock_activity_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_activity_missing_params(self, auth_service):
        """Test activity logging with missing parameters"""
        # Should return early without error
        await auth_service.log_activity('Test Action')

        # Should not raise any exceptions

    @pytest.mark.asyncio
    async def test_get_current_user_info_returns_empty_permissions_without_role(self, auth_service):
        mock_user = SimpleNamespace(
            employee_id=1,
            username='testuser',
            name='Test User',
            email='test@example.com'
        )
        auth_service.employees_repo.get_by_id.return_value = mock_user

        user, permissions = await auth_service.get_current_user_info(1, 1, None)

        assert user == mock_user
        assert permissions == []
        auth_service.employees_repo.get_by_id.assert_awaited_once_with(1)

