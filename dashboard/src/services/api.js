// Every service file in this folder imports its axios instance from here.
// The actual client (with the auth + refresh interceptors) lives in
// src/lib/apiClient.js so there is exactly one axios instance in the app.
import apiClient from "../lib/apiClient";

export default apiClient;