from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Role(Base):
    __tablename__ = 'roles'

    role_id = Column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # One-to-many relationship to Employee (Employee now holds role_id)
    employees = relationship("Employee", back_populates="role", cascade="all, delete-orphan")

    # One-to-many to RolePermission
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    
    # Many-to-one to Restaurant
    restaurant = relationship("Restaurant", back_populates="roles")

    def __repr__(self):
        return f"<Role(id={self.role_id}, name={self.name})>"
