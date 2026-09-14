#!/usr/bin/env bash
# Pit Wall - Create Test User
# Usage: ./create-test-user.sh

set -e

API_URL="http://localhost:3000/api"

echo "Creating test user: manuRacing / Manu.2022"

curl -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"manuRacing","password":"Manu.2022"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "Done! You can now login at http://localhost:4200/login"