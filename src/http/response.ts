import { Response } from 'express';

export interface ApiResponse<T = any> {
    code: number;
    data?: T;
    message?: string;
}

export const success = <T>(res: Response, data: T) => {
    res.json({
        code: 200,
        data,
    } as ApiResponse<T>);
};

export const error = (res: Response, message: string, code: number = 500) => {
    res.status(code).json({
        code,
        message,
    } as ApiResponse);
};
