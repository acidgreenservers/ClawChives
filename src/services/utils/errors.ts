// Custom error classes for better error handling

export class DatabaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class VersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VersionError";
  }
}

export function createError(message: string, cause?: Error): Error {
  return new DatabaseError(message, cause);
}