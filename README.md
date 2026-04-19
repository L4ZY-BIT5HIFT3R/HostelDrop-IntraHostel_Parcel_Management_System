## About

HostelDrop is an intra-hostel parcel management system designed to streamline parcel tracking and handling. It provides a transparent and secure workflow for students and staff, replacing manual processes with a digital solution. Key features include role-based access, real-time notifications, and robust backend validation for secure handover.

## Built With

*   **Node.js:** The core runtime environment.
*   **npm:** Package management for frontend dependencies.
*   **qrcode:** For generating QR codes.
*   **p-locate:** Utility for locating files.
*   **pngjs:** Library for reading and writing PNG files.
*   **internal-slot:** For managing internal object slots.
*   **invariant:** For runtime checks and assertions.
*   **@sindresorhus/is:** A comprehensive type-checking utility.

## Getting Started

This project uses Expo for the frontend and Python for the backend.

### Prerequisites

*   Node.js and npm (or yarn)
*   Python 3.8+
*   A virtual environment tool (like `venv` or `conda`)

### Installation

1.  **Backend:**
    *   Navigate to the `backend/` directory.
    *   Create a virtual environment: `python -m venv venv`
    *   Activate the environment: `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
    *   Install dependencies: `pip install -r requirements.txt`
    *   Copy `.env.example` to `.env` and configure your database credentials.
    *   Seed the database: `python seed_database.py`

2.  **Frontend:**
    *   Navigate to the `frontend/` directory.
    *   Install dependencies: `npm install` (or `yarn install`)
    *   Reset the project to start developing: `npm run reset-project`

## Usage

HostelDrop streamlines parcel management for hostels with distinct roles for guards, students, and admins.

### Guard Workflow: Parcel Intake & Delivery

1.  **Receive Parcel:** Scan student ID or enter details manually.
2.  **Record Parcel:** Input sender, recipient, and parcel type. The system generates a unique tracking ID.
3.  **Notify Student:** The student receives an in-app notification.
4.  **Handover:** Verify student identity upon pickup and mark the parcel as delivered in the app.

### Student Workflow: Parcel Pickup

1.  **Receive Notification:** Get alerted when a parcel arrives for you.
2.  **View Parcel Details:** Check sender and tracking information in the app.
3.  **Pickup:** Present your ID to the guard for verification.
4.  **Confirm Pickup:** The guard marks the parcel as delivered.

### Admin Workflow: Oversight & Management

*   View all parcel records.
*   Manage user accounts and roles.
*   Generate reports on parcel volume and delivery times.

## Repository Structure

This repository is organized to facilitate understanding and development of the HostelDrop Intra-Hostel Parcel Management System.

*   **`/docs`**: Contains project documentation, including the comprehensive `PROJECT_REPORT.md` which details problem framing, architecture, implementation, security, and operational aspects.
*   **`/src`**: Houses the core application source code. This directory is further structured into modules for different system components (e.g., user management, parcel tracking, notifications).
*   **`/tests`**: Includes unit, integration, and end-to-end tests to ensure system reliability and correctness.
*   **`PROJECT_REPORT.md`**: The primary technical report for the project, offering a detailed guide to its various aspects.
*   **`README.md`**: This file provides a high-level overview of the project, its purpose, and how to get started.

## Limitations, Risks, and Mitigation

*   **Monolithic Backend:** The `backend/server.py` file is large, making long-term maintenance challenging.
    *   **Mitigation:** Refactor by splitting routers, services, and schemas into separate packages for better modularity.
*   **Type Checking Disabled:** Pyright is currently set to `typeCheckingMode: off`, reducing static typing benefits.
    *   **Mitigation:** Incrementally move towards stricter type checking, starting with `basic` and then `strict`.
*   **CI Tooling Inconsistency:** The frontend CI workflow uses `yarn`, but the repository lock file is `package-lock.json`.
    *   **Mitigation:** Standardize on a single package manager (e.g., npm) for consistency across development and CI.

## Future Enhancements

*   **Expanded Admin Dashboard:** Introduce more detailed analytics on parcel volume, pickup times, and user activity.
*   **Student Notification Preferences:** Allow students to customize how and when they receive pickup notifications (e.g., SMS, in-app push).
*   **Guard Mobile App Improvements:** Enhance the guard interface with features like barcode scanning for faster parcel intake and offline mode for areas with poor connectivity.
*   **Integration with Hostel Systems:** Explore potential integrations with existing hostel management software for seamless data synchronization.
*   **Enhanced Security Features:** Implement multi-factor authentication for admin accounts and further refine role-based access controls.

## DevOps, Deployment, and Operations

### Local Development Workflow

*   Backend startup and sample data scripts are detailed in `STARTUP.md`.
*   Environment variables are managed using `.env.example` files in `backend/` and `frontend/`.
*   Stress testing procedures are outlined in `stress-tests/README.md`.

### CI/CD Workflows

*   Automated quality checks are performed on pushes and pull requests via GitHub Actions.
*   A manual workflow exists for building Android release artifacts.
*   Note: Current CI frontend quality checks use `yarn`, while the repository uses `package-lock.json`, indicating a potential tooling inconsistency to address.

## API Reference

This section details the available API endpoints, their request/response formats, and security considerations.

*   **Base URL:** `/api`
*   **Methods:** Standard REST semantics (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
*   **Validation:** Most request payloads are validated using Pydantic models.
*   **Security:** Role and scope checks are enforced server-side.

### Example Endpoints

*   **GET `/api/users`**
    *   **Description:** Retrieves a list of users.
    *   **Response Example:**
        ```json
        [
          {"id": 1, "username": "alice"},
          {"id": 2, "username": "bob"}
        ]
        ```
*   **POST `/api/users`**
    *   **Description:** Creates a new user.
    *   **Request Body Example:**
        ```json
        {"username": "charlie", "email": "charlie@example.com"}
        ```
    *   **Response Example:**
        ```json
        {"id": 3, "username": "charlie", "email": "charlie@example.com"}
        ```

## Environment Variables

This section details all environment variables used by the system.

### Backend

*   `APP_ENV`: Sets the application's runtime mode (e.g., `development`, `production`, `test`).
*   `MONGO_URL`: The connection URI for your MongoDB database.
*   `DB_NAME`: The name of the primary database.
*   `JWT_SECRET_KEY`: The secret key used for signing JSON Web Tokens.
*   `ADMIN_EMAIL`: The email address for the initial administrator account.
*   `ADMIN_PASSWORD`: The password for the initial administrator account.

### Frontend

*   `EXPO_PUBLIC_BACKEND_URL`: The base URL for the frontend's API client to communicate with the backend.

### Stress Tests

*   `BASE_URL`: The target backend host for stress testing.
*   `HOSTEL_TYPE`: Specifies the hostel context for the tests.
*   `GUARD_USERNAME`: The username credential for load scripts.
*   `GUARD_PASSWORD`: The password credential for load scripts.

---

*This README was generated by [DevDoq](https://devdoq.com)*