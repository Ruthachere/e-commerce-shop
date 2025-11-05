export interface Payment{
    id: number;
    orderId?: number;
    paymentDate?: Date;
    paymentMethod?: string;
    status?: Status;
    amount?: number;
}


export type Status = "Pending" | "Completed" | "Failed";