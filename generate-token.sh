#!/usr/bin/env bash
# Generate an authentication token for agentsee.
#
# When a token exists, the server binds to 0.0.0.0 (accessible externally)
# and requires the token to access the dashboard and API.
#
# Usage:
#   bash generate-token.sh
#   # Token is written to ~/.config/agentsee/auth-token
#   # Copy the printed token and paste it into the browser login page.

set -euo pipefail

TOKEN_DIR="${HOME}/.config/agentsee"
TOKEN_FILE="${TOKEN_DIR}/auth-token"

mkdir -p "$TOKEN_DIR"
chmod 700 "$TOKEN_DIR"

# 48 bytes of randomness → 64 chars base64url (no padding)
TOKEN=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")

printf '%s' "$TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

echo "Token written to: $TOKEN_FILE"
echo ""
echo "  $TOKEN"
echo ""
echo "Paste this into the agentsee login page."
echo "The server will bind to 0.0.0.0 when a token file is present."
