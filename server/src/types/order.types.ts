import { OrderItems } from "./orderItems.types";
import { Payment } from "./payment.types";

export interface Order{
    id:number;
    userId:number;
    orderDate?: Date;
    status: Status;
    totalAmount?: number;
    shippingCity?: string;
    shippingState?: string;
    shippingCountry?: string;
    shippingMethod?: string;
    updatedAt?: Date;
    orderItems?: OrderItems[];
    payment? : Payment | null;

}

export type Status = "Pending" | "Shipped" | "Delivered" | "Cancelled";