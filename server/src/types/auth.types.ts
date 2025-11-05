// DTO for registration and login
export interface RegisterDTO {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: number; 
  password: string;
  role?: 'Admin' | 'Basic'; 
}

export interface LoginDTO {
  username: string
  email: string;
 password: string;
}
