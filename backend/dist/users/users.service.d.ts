import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    findAll(): Promise<UserDocument[]>;
    findById(id: string): Promise<UserDocument>;
    update(id: string, requesterId: string, data: Partial<User>): Promise<UserDocument>;
    changePassword(id: string, requesterId: string, oldPassword: string, newPassword: string): Promise<void>;
    getRecentlyViewed(userId: string): Promise<unknown[]>;
    addRecentlyViewed(userId: string, taskId: string): Promise<void>;
    getMyStats(userId: string): Promise<Record<string, unknown>>;
}
