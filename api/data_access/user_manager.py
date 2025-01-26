from data_access.connector import db
from dataclasses import dataclass, asdict, field
from bson.objectid import ObjectId
from typing import List, Optional
import json
from bson.json_util import dumps


@dataclass
class UserProfileDoc: 
      _id           : ObjectId = field(default_factory=ObjectId)
      sub           : Optional[str] = None
      nickname      : Optional[str] = None
      username      : Optional[str] = None
      elo           : int = 1000
      strategies    : List[ObjectId] = field(default_factory=list)
      last_login    : Optional[str] = None

class UserProfileManager:
    def __init__(self) -> None:
        self.users = db.get_collection('user_profiles')
        self.current_user: Optional[UserProfileDoc] = None

    def load_one_by_sub(self, sub: str) -> bool:
        """Load a single user profile by the unique Auth0 sub identifier."""
        user_doc = self.users.find_one({"sub": sub})
        if user_doc:
            self.current_user = UserProfileDoc(**user_doc)
            return True
        else:
            return False

    def load_by_id(self, user_id: str):
        """Load a single user profile by MongoDB ObjectId."""
        user_doc = self.users.find_one({"_id": ObjectId(user_id)})
        if user_doc:
            self.current_user = UserProfileDoc(**user_doc)

    def getCurrent(self):
        """Return the current user document as a JSON object."""
        return json.loads(dumps(asdict(self.current_user))) if self.current_user else None

    def get_all_users(self):
        """Retrieve all user profiles."""
        self.current_users_collection = [UserProfileDoc(**doc) for doc in self.users.find()]
        return json.loads(dumps([asdict(user) for user in self.current_users_collection]))

    def add_user(self, user_data: UserProfileDoc) -> bool:
        """Add a new user profile to the collection."""
        user = UserProfileDoc(**asdict(user_data))
        if self.users.insert_one(asdict(user)):
            return True
        else:
            return False

    def update_user_elo(self, sub: str, new_elo: int):
        """Update the ELO score for a user with the given Auth0 sub."""
        self.users.update_one({"sub": sub}, {"$set": {"elo": new_elo}})
        if self.current_user and self.current_user.sub == sub:
            self.current_user.elo = new_elo

    def delete_user(self, sub: str):
        """Delete a user profile by the unique Auth0 sub identifier."""
        self.users.delete_one({"sub": sub})
        if self.current_user and self.current_user.sub == sub:
            self.current_user = None
