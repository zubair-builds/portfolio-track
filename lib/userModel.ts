export interface User {
  name: string;
  email: string;
  password: string;
}

export const createUser = (name: string, email: string, password: string): User => ({
  name,
  email,
  password,
});

