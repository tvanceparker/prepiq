# PrepIQ - Restaurant Management System

![Python](https://img.shields.io/badge/python-v3.13-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)
![React](https://img.shields.io/badge/React-18.2.0-blue.svg)
![Status](https://img.shields.io/badge/status-private-red.svg)
![Status](https://img.shields.io/badge/status-private-red.svg)

PrepIQ is a comprehensive restaurant management system built to help restaurants optimize their operations through intelligent forecasting, inventory management, and team coordination.

## 🌟 Features

### Core Functionality
- **Sales Forecasting**: AI-powered sales predictions with weather and traffic integration
- **Inventory Management**: Real-time inventory tracking with automated reordering
- **Menu Management**: Dynamic menu item management with recipe costing
- **Prep Scheduling**: Intelligent prep schedule generation based on forecasts
- **Team Management**: Employee scheduling, clock-in/out, and role-based permissions
- **Analytics Dashboard**: Comprehensive reporting and profit analytics

### Advanced Features
- **Real-time WebSocket Communication**: Live updates for kitchen and waiter coordination
- **Multi-tier Subscription System**: Basic, Pro, and Enterprise feature sets
- **Role-based Access Control**: Granular permissions system
- **EOD (End of Day) Automation**: Automated daily tasks and reporting
- **Alert System**: Intelligent notifications for inventory, prep, and operational issues

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with async/await support
- **Database**: MySQL with SQLAlchemy ORM (async)
- **Authentication**: JWT-based with role-based permissions
- **API**: RESTful API with OpenAPI documentation
- **Real-time**: WebSocket support for live updates
- **Scheduling**: APScheduler for automated tasks

### Frontend (React)
- **Framework**: React 18.2.0 with hooks
- **State Management**: Zustand and TanStack Query
- **UI Components**: Chakra UI and Material-UI
- **Routing**: React Router v7
- **Charts**: Recharts, D3, and Nivo for data visualization
- **Forms**: Formik with Yup validation

### Database Schema
- **Users & Permissions**: Role-based access control
- **Restaurant Data**: Multi-tenant architecture
- **Inventory**: Real-time stock tracking with suppliers
- **Sales & Forecasting**: Historical data with prediction models
- **Scheduling**: Employee shifts and prep schedules

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Node.js 24+
- MySQL 8.0+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/prepiq.git
   cd prepiq
   ```

2. **Backend Setup**
   ```bash
   # Create virtual environment
   python -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   # or
   .venv\Scripts\activate  # Windows
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE prep_iq;
   
   # Configure environment variables
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Run the Application**
   ```bash
   # Terminal 1: Backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2: Frontend
   cd frontend
   npm start
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Default Login Credentials
- Username: `testuser`
- Password: `password`

## 📋 API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation powered by FastAPI's automatic OpenAPI generation.

## 🧪 Testing

### Backend Tests
```bash
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
npx playwright test
```

## 📁 Project Structure

```
prepiq/
├── app/                          # Backend application
│   ├── api/                      # API routes
│   │   └── v1/                   # API version 1
│   ├── core/                     # Core functionality
│   ├── db/                       # Database models and session
│   ├── schemas/                  # Pydantic schemas
│   ├── services/                 # Business logic
│   ├── utils/                    # Utility functions
│   └── integrations/             # External service integrations
├── frontend/                     # React frontend
│   ├── public/                   # Static assets
│   ├── src/                      # Source code
│   │   ├── components/           # Reusable components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom hooks
│   │   ├── services/             # API services
│   │   └── utils/                # Utility functions
├── tests/                        # Test files
│   ├── e2e/                      # End-to-end tests
│   └── unit/                     # Unit tests
├── scripts/                      # Database and utility scripts
├── docs/                         # Documentation
└── requirements.txt              # Python dependencies
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=prep_iq

# Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
DEBUG=True
ENVIRONMENT=development
```

## 🛠️ Development

### Setting up Development Environment

1. **Install development dependencies**
   ```bash
   pip install -r requirements-dev.txt
   cd frontend && npm install --include=dev
   ```

2. **Pre-commit hooks**
   ```bash
   pre-commit install
   ```

3. **Code formatting**
   ```bash
   # Python
   black .
   isort .
   
   # JavaScript
   cd frontend && npm run format
   ```

## 🚀 Deployment

### Manual Deployment
1. Set up production database
2. Configure environment variables  
3. Build frontend: `cd frontend && npm run build`
4. Deploy backend with a production WSGI server
5. Serve frontend static files

## 📊 Features in Detail

### Sales Forecasting
- Machine learning models for demand prediction
- Weather data integration for seasonal adjustments
- Traffic pattern analysis
- Historical sales trend analysis

### Inventory Management
- Real-time stock level tracking
- Automated reorder point calculations
- Supplier management and pricing
- Waste tracking and spoilage alerts

### Team Management
- Employee clock-in/out system
- Shift scheduling and labor cost tracking
- Role-based permissions and access control
- Performance analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License & Usage

**This is a private repository.** All rights reserved. This software is proprietary and confidential.

## 🙏 Acknowledgments

- Built with dedication for restaurant operational excellence
- Developed through hands-on experience in the food service industry
- Continuously refined based on real-world restaurant needs

## 📞 Support

For technical support or business inquiries, please contact the development team.

## 🗺️ Roadmap

- [ ] Mobile app development (React Native)
- [ ] Advanced ML forecasting models with seasonal adjustments
- [ ] POS system integrations (Square, Toast, etc.)
- [ ] Multi-location franchise support
- [ ] Advanced reporting and business intelligence
- [ ] Customer loyalty program integration
- [ ] Third-party delivery platform integrations

---

**PrepIQ** - Preparing restaurants for success, one prediction at a time.
