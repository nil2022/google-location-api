# Google Places API - Secure Proxy & Rate Limiter

This project provides a secure and robust solution for integrating the Google Places API into a web application. It features a dedicated Node.js backend that acts as a proxy, protecting your secret API key and implementing a powerful, configurable rate limiter. The frontend is a clean React application built with Vite that demonstrates how to interact with the secure backend.

This architecture solves the common problem of exposing sensitive API keys on the client-side and protects your application from abuse and excessive costs.

## Core Features

-   🔐 **Secure API Key Management**: Your primary Google API key is stored securely on the backend and never exposed to the browser.
-   🛡️ **Advanced Rate Limiting**: A built-in, in-memory rate limiter protects your API from abuse with a multi-layered strategy:
    -   Per-IP request limits (e.g., 10 requests/minute)
    -   Burst protection (e.g., 5 requests/10 seconds)
    -   Global request limits to prevent server overload
    -   Automatic IP blacklisting for suspicious activity (e.g., 50 requests/hour)
-   🏗️ **Clean Architecture**: A clear separation of concerns with a dedicated `backend` for logic and a `frontend` for presentation.
-   ⚙️ **Highly Configurable**: All rate-limiting parameters and API keys are managed through `.env` files for easy configuration without changing the code.
-   🚀 **Modern Frontend**: Built with React and Vite for a fast, modern development experience with Hot Module Replacement (HMR).

## Project Structure

The project is organized as a monorepo with two distinct packages:

```
google-location-api/
├── backend/         # Node.js Express Server
│   ├── .env
│   ├── server.js
│   ├── rateLimiter.js
│   └── package.json
└── frontend/        # React + Vite Client
    ├── .env
    ├── src/
    └── package.json
```

## Tech Stack

-   **Backend**: Node.js, Express, Axios, Helmet, CORS
-   **Frontend**: React, Vite, Tailwind CSS, `@react-google-maps/api`

---

## Getting Started

Follow these instructions to get the project set up and running on your local machine.

### Prerequisites

-   Node.js (v18.x or later recommended)
-   npm or yarn

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/google-location-api.git
    cd google-location-api
    ```

2.  **Set up Backend Environment Variables:**
    Navigate to the `backend` folder, create a `.env` file, and add the following variables.

    ```bash
    # /backend/.env
    
    # Your primary, secret Google API Key with Places API enabled.
    # IMPORTANT: Keep this key secure. Restrict it to your server's IP address in the Google Cloud Console.
    GOOGLE_API_KEY="YOUR_SECRET_GOOGLE_API_KEY_HERE"

    # The port for the backend server to run on.
    PORT=3001
    
    # Allowed origins for CORS (comma-separated, no spaces)
    CORS_ALLOWED_ORIGINS=http://localhost:5173

    # --- Rate Limiter Configuration ---
    RATE_LIMIT_IP_REQUESTS=10
    RATE_LIMIT_IP_WINDOW_MS=60000
    RATE_LIMIT_BURST_REQUESTS=5
    RATE_LIMIT_BURST_WINDOW_MS=10000
    RATE_LIMIT_GLOBAL_REQUESTS=100
    RATE_LIMIT_GLOBAL_WINDOW_MS=60000
    BLACKLIST_HOURLY_THRESHOLD=50
    BLACKLIST_DURATION_MS=3600000
    ```

3.  **Set up Frontend Environment Variables:**
    Navigate to the `frontend` folder, create a `.env` file, and add the following variables.

    ```bash
    # /frontend/.env
    
    # This key is for RENDERING the map tiles on the frontend.
    # It is safe to be public, but you MUST restrict it to your website's HTTP referrer (e.g., http://localhost:5173) in the Google Cloud Console.
    VITE_GOOGLE_MAPS_API_KEY="YOUR_FRONTEND_GOOGLE_MAPS_KEY_HERE"

    # The URL of your backend proxy server.
    VITE_PROXY_URL="http://localhost:3001"
    ```

4.  **Install Dependencies for Both Projects:**
    From the root directory, run the following commands:
    ```bash
    # Install backend dependencies
    cd backend
    npm install
    
    # Install frontend dependencies
    cd ../frontend
    npm install
    ```

### Running the Application

You will need two separate terminals to run both the backend and frontend servers simultaneously.

**Terminal 1: Run the Backend Server**
```bash
# Navigate to the backend directory
cd backend

# Start the server
npm start
```
> The proxy server should now be running at `http://localhost:3001`.

**Terminal 2: Run the Frontend Application**
```bash
# Navigate to the frontend directory
cd frontend

# Start the Vite development server
npm run dev
```
> Your React application should now be running, typically at `http://localhost:5173`. Open this URL in your browser.

---

## API Endpoints

The backend exposes the following proxied endpoints, which are protected by the rate limiter.

| Method | Endpoint                    | Body (JSON)             | Description                                     |
| :----- | :-------------------------- | :---------------------- | :---------------------------------------------- |
| `POST` | `/api/places/autocomplete`  | `{"input": "london"}`   | Fetches place suggestions from the Google API.  |
| `POST` | `/api/places/details`       | `{"place_id": "ChIJ..."}`| Fetches detailed information for a specific place. |

## Rate Limiter Configuration

The rate limiter can be fully configured from the `backend/.env` file.

| Variable                   | Default   | Description                                                     |
| :------------------------- | :-------- | :-------------------------------------------------------------- |
| `RATE_LIMIT_IP_REQUESTS`   | `10`      | Max requests per IP within the window.                          |
| `RATE_LIMIT_IP_WINDOW_MS`  | `60000`   | Time window for the per-IP limit in milliseconds (1 minute).    |
| `RATE_LIMIT_BURST_REQUESTS`| `5`       | Max requests per IP in a short burst window.                    |
| `RATE_LIMIT_BURST_WINDOW_MS`| `10000`   | Time window for burst protection in milliseconds (10 seconds).  |
| `BLACKLIST_HOURLY_THRESHOLD`| `50`      | Number of requests from an IP in an hour to trigger a blacklist.|
| `BLACKLIST_DURATION_MS`    | `3600000` | How long an IP remains blacklisted in milliseconds (1 hour).    |