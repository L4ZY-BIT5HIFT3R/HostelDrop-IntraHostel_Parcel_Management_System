from __future__ import annotations

import os
import random
import string
from locust import HttpUser, between, task
from locust.exception import StopUser


HOSTEL_TYPE = os.getenv("HOSTEL_TYPE", "BOYS")
GUARD_USERNAME = os.getenv("GUARD_USERNAME", "")
GUARD_PASSWORD = os.getenv("GUARD_PASSWORD", "")
LOCUST_TEST_MODE = os.getenv("LOCUST_TEST_MODE", "performance").strip().lower()


def _is_rate_limit_mode() -> bool:
    return LOCUST_TEST_MODE in {"rate-limit", "ratelimit", "guardrail"}


def _random_room() -> str:
    return f"A-{random.randint(1, 900)}"


def _random_description(size: int = 120) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(size))


class GuardWorkflowUser(HttpUser):
    wait_time = between(0.2, 1.2)

    def on_start(self) -> None:
        self.is_authenticated = False

        if not GUARD_USERNAME or not GUARD_PASSWORD:
            raise RuntimeError("Set GUARD_USERNAME and GUARD_PASSWORD env vars before running Locust")

        payload = {
            "username": GUARD_USERNAME,
            "password": GUARD_PASSWORD,
            "hostel_type": HOSTEL_TYPE,
        }
        with self.client.post(
            "/api/auth/guard/login",
            json=payload,
            name="auth_guard_login",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                token = response.json().get("access_token")
                if not token:
                    response.failure("Guard login response missing access_token")
                    raise StopUser("Missing access token in login response")
                self.client.headers.update({"Authorization": f"Bearer {token}"})
                self.is_authenticated = True
                response.success()
                return

            if response.status_code == 429 and _is_rate_limit_mode():
                # In rate-limit validation mode, 429 is expected behavior.
                response.success()
                raise StopUser("Login rate limited as expected in rate-limit mode")

            if response.status_code != 200:
                response.failure(f"Guard login failed: {response.status_code} {response.text}")
                raise StopUser(f"Login failed with status {response.status_code}")

    @task(6)
    def get_pending_parcels(self) -> None:
        if not self.is_authenticated:
            raise StopUser("User is not authenticated")
        self.client.get("/api/parcel/guard/pending", name="guard_pending")

    @task(4)
    def get_delivered_parcels(self) -> None:
        if not self.is_authenticated:
            raise StopUser("User is not authenticated")
        self.client.get("/api/parcel/guard/delivered", name="guard_delivered")

    @task(2)
    def add_parcel_small(self) -> None:
        if not self.is_authenticated:
            raise StopUser("User is not authenticated")
        payload = {
            "hostel_type": HOSTEL_TYPE,
            "room_number": _random_room(),
            "roll_number": None,
            "student_name": None,
            "description": "Routine parcel",
        }
        self.client.post("/api/parcel/add", json=payload, name="parcel_add_small")

    @task(1)
    def add_parcel_large_description(self) -> None:
        if not self.is_authenticated:
            raise StopUser("User is not authenticated")
        payload = {
            "hostel_type": HOSTEL_TYPE,
            "room_number": _random_room(),
            "roll_number": None,
            "student_name": None,
            "description": _random_description(size=300),
        }
        self.client.post("/api/parcel/add", json=payload, name="parcel_add_large")
