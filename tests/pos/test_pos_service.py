import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.internal_pos_service import InternalPOSService
from app.schemas.pos_dto import DeviceRegistrationRequest, PaymentRequest
from app.repositories.devices_repo import DevicesRepository
from app.repositories.restaurants_repo import RestaurantRepository


class TestPOSService:
    @pytest.fixture
    def mock_db(self):
        return AsyncMock()

    @pytest.fixture
    def mock_repos(self, mock_db):
        """Create mock repositories"""
        devices_repo = AsyncMock(spec=DevicesRepository)
        restaurant_repo = AsyncMock(spec=RestaurantRepository)

        return {
            'devices': devices_repo,
            'restaurant': restaurant_repo
        }

    @pytest.fixture
    def pos_service(self, mock_db, mock_repos):
        """Create InternalPOSService with mocked dependencies"""
        service = InternalPOSService(mock_db, 1, 'pro', 1)
        # Override the repositories with mocks
        service.devices_repo = mock_repos['devices']
        service.restaurant_repo = mock_repos['restaurant']
        return service

    @pytest.mark.asyncio
    async def test_register_device_success(self, pos_service, mock_repos):
        """Test successful device registration"""
        # Mock device creation
        mock_device = MagicMock()
        mock_device.device_id = 123
        mock_device.device_type = 'pos_terminal'
        mock_device.device_settings = {}
        mock_repos['devices'].create.return_value = mock_device

        # Mock restaurant settings
        mock_repos['restaurant'].get_settings.return_value = {
            'has_pos_display': True,
            'has_kitchen_display': False,
            'default_ui_layout': 'grid'
        }

        registration_data = DeviceRegistrationRequest(
            device_name='Main POS Terminal',
            device_type='pos_terminal',
            device_fingerprint='test-fingerprint'
        )

        result = await pos_service.register_device(registration_data)

        assert result['device_id'] == 123
        assert result['device_type'] == 'pos_terminal'
        assert 'merged_settings' in result
        assert 'restaurant_capabilities' in result

        mock_repos['devices'].create.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_device_settings(self, pos_service, mock_repos):
        """Test retrieving device settings"""
        mock_device = MagicMock()
        mock_device.device_id = 123
        mock_device.device_type = 'pos_terminal'
        mock_device.device_settings = {'theme': 'dark'}
        mock_repos['devices'].get_by_id.return_value = mock_device

        mock_repos['restaurant'].get_settings.return_value = {
            'theme': 'light',
            'language': 'en'
        }

        result = await pos_service.get_device_settings(123)

        assert result['device_id'] == 123
        assert result['device_type'] == 'pos_terminal'
        assert result['merged_settings']['theme'] == 'dark'  # Device setting overrides
        assert result['merged_settings']['language'] == 'en'  # Restaurant setting preserved

    @pytest.mark.asyncio
    async def test_update_device_settings(self, pos_service, mock_repos):
        """Test updating device settings"""
        mock_device = MagicMock()
        mock_device.device_settings = {'theme': 'light'}
        mock_repos['devices'].get_by_id.return_value = mock_device

        settings_update = {
            'theme': 'dark',
            'language': 'es'
        }

        result = await pos_service.update_device_settings(123, settings_update)

        assert result['status'] == 'updated'
        assert result['device_settings']['theme'] == 'dark'
        assert result['device_settings']['language'] == 'es'

        mock_repos['devices'].update.assert_called_once_with(123, {'device_settings': {'theme': 'dark', 'language': 'es'}})

    @pytest.mark.asyncio
    async def test_merge_settings(self, pos_service):
        """Test merging restaurant and device settings"""
        restaurant_settings = {
            'theme': 'light',
            'language': 'en',
            'notifications': True
        }

        device_settings = {
            'theme': 'dark',
            'sound_enabled': False
        }

        result = pos_service.merge_settings(restaurant_settings, device_settings)

        assert result['theme'] == 'dark'  # Device overrides restaurant
        assert result['language'] == 'en'  # Restaurant preserved
        assert result['notifications'] is True  # Restaurant preserved
        assert result['sound_enabled'] is False  # Device added

    @pytest.mark.asyncio
    async def test_send_order_to_kitchen(self, pos_service):
        """Test sending order to kitchen via WebSocket"""
        order_data = {'order_id': 123, 'items': ['burger', 'fries']}

        result = await pos_service.send_order_to_kitchen(order_data)

        assert result['status'] == 'sent_to_kitchen'

    @pytest.mark.asyncio
    async def test_create_payment_intent(self, pos_service):
        """Test creating Stripe payment intent"""
        payment_req = PaymentRequest(
            order_id=123,
            amount=2599,  # $25.99 in cents
            currency='usd'
        )

        # Mock Stripe PaymentIntent
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = MagicMock()
            mock_intent.client_secret = 'pi_secret_123'
            mock_intent.id = 'pi_123'
            mock_intent.status = 'requires_payment_method'
            mock_create.return_value = mock_intent

            result = await pos_service.create_payment_intent(payment_req)

            assert result.client_secret == 'mock_secret_123'
            assert result.payment_intent_id.startswith('pi_mock_')
            assert result.status == 'succeeded'

    @pytest.mark.asyncio
    async def test_confirm_payment(self, pos_service):
        """Test confirming payment"""
        # Mock Stripe PaymentIntent
        with patch('stripe.PaymentIntent.retrieve') as mock_retrieve:
            mock_intent = MagicMock()
            mock_intent.status = 'requires_confirmation'
            mock_intent.id = 'pi_123'
            mock_retrieve.return_value = mock_intent

            result = await pos_service.confirm_payment('pi_123')

            assert result['status'] == 'succeeded'
            assert result['payment_intent_id'] == 'pi_123'
