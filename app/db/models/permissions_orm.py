from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Permission(Base):
    __tablename__ = 'permissions'

    permission_id = Column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # One-to-many to RolePermission
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    # Many-to-one to Restaurant
    restaurant = relationship("Restaurant", back_populates="permissions")

    def __repr__(self):
        return f"<Permission(id={self.permission_id}, name={self.name})>"
