import { NextRequest, NextResponse } from 'next/server';

// Handle Trello OAuth callback - creates the postMessage receiver page
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.TRELLO_API_KEY;
    
    if (!apiKey) {
      throw new Error('Trello API key not configured');
    }

    // Create callback page that receives postMessage from Trello's authorization
    const callbackHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Connecting to Trello...</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0079bf 0%, #026aa7 100%);
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 3rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            animation: fadeInUp 0.6s ease-out;
        }
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .loading-icon {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #ffffff;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto 2rem;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .success-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            border-radius: 50%;
            margin: 0 auto 2rem;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(76, 175, 80, 0.3);
        }
        .checkmark {
            color: white;
            font-size: 2.5rem;
            font-weight: bold;
        }
        .error {
            color: #ff6b6b;
            background: rgba(255, 107, 107, 0.1);
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid rgba(255, 107, 107, 0.3);
            margin-top: 1rem;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="loading-icon" id="loading"></div>
        <div class="success-icon" id="success">
            <div class="checkmark">✓</div>
        </div>
        <h1 id="title">Connecting to Trello...</h1>
        <p id="message">Please wait while we complete the connection.</p>
        <div class="error" id="error"></div>
    </div>

    <script>
        const apiKey = '${apiKey}';
        let token = null;

        // Function to update UI
        function updateUI(success, title, message, error = null) {
            document.getElementById('loading').style.display = success ? 'none' : 'block';
            document.getElementById('success').style.display = success ? 'flex' : 'none';
            document.getElementById('title').textContent = title;
            document.getElementById('message').textContent = message;
            
            if (error) {
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = error;
            }
        }

        // Function to validate token and get user info
        async function validateAndStoreToken(token) {
            try {
                const response = await fetch(\`https://api.trello.com/1/members/me?key=\${apiKey}&token=\${token}\`);
                
                if (!response.ok) {
                    throw new Error('Invalid token received from Trello');
                }

                const userData = await response.json();

                // Store the connection data
                const connectionData = {
                    platform: 'trello',
                    isConnected: true,
                    credentials: {
                        apiKey: apiKey,
                        token: token,
                        // Trello tokens with expiration=never don't expire
                    },
                    userEmail: userData.email || '',
                    userName: userData.fullName || userData.username,
                };
                
                localStorage.setItem('trello-connection', JSON.stringify(connectionData));
                
                // Notify parent window
                if (window.opener) {
                    window.opener.postMessage({ 
                        type: 'trello-auth-success', 
                        data: connectionData 
                    }, window.location.origin);
                }

                updateUI(true, '🎉 Connected to Trello!', 
                    \`Successfully connected as \${userData.fullName || userData.username}. This window will close automatically.\`);

                // Close window after delay
                setTimeout(() => {
                    if (window.opener) {
                        window.close();
                    } else {
                        window.location.href = '/settings?success=trello_connected';
                    }
                }, 2000);

            } catch (error) {
                console.error('Error validating token:', error);
                updateUI(false, 'Connection Failed', 'Please try connecting again.', error.message);
            }
        }

        // Listen for postMessage from Trello authorization
        window.addEventListener('message', function(event) {
            console.log('Received postMessage:', event);
            
            // Security: Check origin (Trello posts from their domain)
            if (event.origin !== 'https://trello.com') {
                console.warn('Ignoring message from unexpected origin:', event.origin);
                return;
            }

            // Trello sends the token in the message data
            if (event.data && typeof event.data === 'string') {
                // Token might be in the message directly
                token = event.data;
            } else if (event.data && event.data.token) {
                // Or in a token property
                token = event.data.token;
            }

            if (token) {
                console.log('Received token from Trello');
                validateAndStoreToken(token);
            } else {
                console.error('No token received in postMessage:', event.data);
                updateUI(false, 'Connection Failed', 'No authorization token received from Trello.');
            }
        });

        // Check URL for token (fallback for fragment method)
        const urlParams = new URLSearchParams(window.location.search);
        const urlHash = window.location.hash;
        
        // Check if token is in URL hash (fragment method)
        if (urlHash && urlHash.includes('token=')) {
            const match = urlHash.match(/token=([^&]+)/);
            if (match) {
                token = match[1];
                console.log('Found token in URL hash');
                validateAndStoreToken(token);
            }
        }
        // Check if token is in URL params
        else if (urlParams.get('token')) {
            token = urlParams.get('token');
            console.log('Found token in URL params');
            validateAndStoreToken(token);
        }
        // Wait for postMessage
        else {
            console.log('Waiting for postMessage from Trello...');
        }

        // Timeout after 30 seconds
        setTimeout(() => {
            if (!token) {
                updateUI(false, 'Connection Timeout', 
                    'The connection process took too long. Please try again.',
                    'No response received from Trello within 30 seconds.');
            }
        }, 30000);
    </script>
</body>
</html>`;

    return new NextResponse(callbackHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: any) {
    console.error('Error in Trello OAuth callback:', error);
    
    // Redirect to frontend with error
    const errorUrl = new URL('/settings?error=trello_callback_failed', request.url);
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  }
}

// Keep the POST method for alternative handling
export async function POST(request: NextRequest) {
  try {
    const { token, state } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.TRELLO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Trello API key not configured' },
        { status: 500 }
      );
    }

    // Validate the token
    const testResponse = await fetch(`https://api.trello.com/1/members/me?key=${apiKey}&token=${token}`);
    
    if (!testResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid Trello token' },
        { status: 401 }
      );
    }

    const userData = await testResponse.json();

    return NextResponse.json({
      success: true,
      apiKey,
      token,
      userEmail: userData.email,
      userName: userData.fullName || userData.username,
    });
  } catch (error: any) {
    console.error('Error in Trello OAuth POST callback:', error);
    return NextResponse.json(
      { error: 'Failed to process callback: ' + error.message },
      { status: 500 }
    );
  }
}