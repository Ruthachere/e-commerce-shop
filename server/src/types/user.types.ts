export interface User {
 id:number;
 username:string;
 email:string;
 phoneNumber?:number;
 firstName?:string;
 lastName?:string;
 createdAt?: Date;
 role : Role;
}

export type Role= "Basic" | "Admin";