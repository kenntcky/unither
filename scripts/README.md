# TaskMaster FCM Notification Sender Script

This script (`fcmSender.js`) is designed to be run by a scheduled job (e.g., GitHub Actions) to process a notification queue in Firestore and send Firebase Cloud Messaging (FCM) notifications.

## Prerequisites

1.  **Node.js and npm**: Ensure Node.js (which includes npm) is installed in the environment where this script will run.
2.  **Firebase Project**: A Firebase project must be set up with Firestore and Firebase Cloud Messaging enabled.
3.  **Firebase Admin SDK Service Account Key**: You need a service account key (JSON file) from your Firebase project to allow the script to authenticate and interact with Firebase services.
    *   Go to your Firebase project settings -> Service accounts.
    *   Generate a new private key and download the JSON file.

## Setup

1.  **Place Service Account Key**: 
    *   **Local Development**: You can place the downloaded service account JSON file (e.g., `serviceAccountKey.json`) in a secure location accessible by the script. **DO NOT COMMIT THIS FILE TO GIT.**
    *   **GitHub Actions (Recommended)**: Store the content of the service account JSON file as a secret in your GitHub repository (e.g., `FIREBASE_SERVICE_ACCOUNT_KEY_JSON`). The GitHub Actions workflow will then make this available to the script, typically by writing it to a temporary file whose path is then set to the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.

2.  **Install Dependencies**:
    Navigate to the `scripts` directory and run:
    ```bash
    npm install
    ```

## Environment Variables

*   `GOOGLE_APPLICATION_CREDENTIALS`: This environment variable **must** be set to the path of your Firebase service account key JSON file. The script will not run without it.

## Running the Script

1.  **Set Environment Variable**:
    ```bash
    # Example for Linux/macOS (replace with your actual path)
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"
    
    # Example for Windows (PowerShell)
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\serviceAccountKey.json"
    ```

2.  **Execute the Script**:
    Navigate to the `scripts` directory and run:
    ```bash
    node fcmSender.js
    ```
    Or, using the npm script defined in `package.json`:
    ```bash
    npm start
    ```

## Script Logic

1.  **Initialization**: Initializes the Firebase Admin SDK using the provided service account credentials.
2.  **Query Queue**: Fetches pending notifications (status: 'pending') from the `notification_queue` collection in Firestore, ordered by creation time.
3.  **Process Notifications**: For each pending notification:
    *   Constructs an FCM message payload (topic, title, body, data, Android/APNS specific settings).
    *   Sends the FCM message.
    *   Updates the notification document in Firestore:
        *   On success: status to 'sent', adds `sentAt` timestamp and `fcmMessageId`.
        *   On error: status to 'error', adds `errorMessage`, `errorCode`, and `attemptedAt` timestamp.
4.  **Batching**: Processes up to `MAX_NOTIFICATIONS_TO_PROCESS` (default 50) notifications per run to avoid long execution times and potential timeouts in serverless environments.

## GitHub Actions Integration

This script is intended to be run via a scheduled GitHub Actions workflow. The workflow will need to:

1.  Check out the repository.
2.  Set up Node.js.
3.  Install dependencies (`npm install` in the `scripts` directory).
4.  Create the service account key file from a GitHub secret and set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.
5.  Run the script (`npm start` in the `scripts` directory).

## Important Notes

*   **Security**: Never commit your service account key directly to your repository. Use GitHub Secrets or a similar secure mechanism for CI/CD environments.
*   **Error Handling**: The script includes basic error handling. Monitor its output for any issues.
*   **Client-Side Channel**: The script specifies an Android notification channel ID (`taskmaster_notifications`). Ensure this channel is created on the Android client app to customize notification appearance and sound.
*   **Idempotency**: The script aims to be idempotent by only processing 'pending' notifications and updating their status. If a run fails midway, subsequent runs should pick up where it left off (for unprocessed 'pending' items).
