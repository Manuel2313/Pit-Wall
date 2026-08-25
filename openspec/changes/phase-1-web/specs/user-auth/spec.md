# user-auth Specification

## Purpose

In-house email/password accounts (PRD §6, §8): registration, secure password storage, login with persistent sessions, route protection, logout and password recovery. Discord OAuth is a later work unit and out of scope here.

## Requirements

### Requirement: Registration

The system MUST let a user register with an email and a password of at least 8 characters. Registration with an email already in use MUST be rejected with a clear error.

#### Scenario: New account created

- GIVEN an email not yet registered and a valid password
- WHEN the user registers
- THEN the account is created and the user can log in

#### Scenario: Duplicate email rejected

- GIVEN an email already registered
- WHEN a second registration uses it
- THEN registration is rejected with a clear error

### Requirement: Password never stored in clear

The system MUST NOT store passwords in plaintext or reversible form; passwords MUST be hashed in-house before storage.

#### Scenario: Stored password is hashed

- GIVEN a registered user
- WHEN the account record is inspected
- THEN the stored password is hashed and the original cannot be recovered

### Requirement: Login

The system MUST issue a session when email and password match. Wrong credentials MUST be rejected with a generic error that does not reveal which field was wrong.

#### Scenario: Successful login

- GIVEN a registered user with correct credentials
- WHEN the user logs in
- THEN a session is created and the user is authenticated

#### Scenario: Wrong password rejected

- GIVEN a registered user
- WHEN the user logs in with a wrong password
- THEN login is rejected with a generic error

### Requirement: Persistent session

A session MUST survive page reloads and remain valid until logout or expiry.

#### Scenario: Reload keeps the session

- GIVEN an authenticated user
- WHEN the page is reloaded
- THEN the user remains authenticated

### Requirement: Route protection

The system MUST block unauthenticated access to protected pages and API routes and MUST redirect or reject such access.

#### Scenario: Protected page requires login

- GIVEN a visitor without a session
- WHEN they open a protected page
- THEN they are redirected to login

#### Scenario: API rejects missing session

- GIVEN a request without a session
- WHEN it reaches a protected API route
- THEN it is rejected with an unauthorized response

### Requirement: Logout

The system MUST invalidate the session on logout; requests with that session MUST be rejected afterwards.

#### Scenario: Logout ends the session

- GIVEN an authenticated user
- WHEN they log out and then access a protected route
- THEN access is rejected

### Requirement: Password recovery

The system MUST let a registered user request password recovery by email. A reset token MUST be required to change the password, and invalid or expired tokens MUST be rejected.

#### Scenario: Recovery email sent

- GIVEN a registered email
- WHEN the user requests recovery
- THEN a recovery email is sent

#### Scenario: Expired token rejected

- GIVEN a password reset attempt with an invalid or expired token
- WHEN the user submits it
- THEN the reset is rejected and the password is unchanged