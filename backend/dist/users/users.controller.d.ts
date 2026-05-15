import { UsersService } from './users.service';
import { UserDocument } from './user.schema';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<UserDocument[]>;
    getRecentlyViewed(req: {
        user: UserDocument;
    }): Promise<unknown[]>;
    getMyStats(req: {
        user: UserDocument;
    }): Promise<Record<string, unknown>>;
    findOne(id: string): Promise<UserDocument>;
    update(id: string, req: {
        user: UserDocument;
    }, body: Partial<UserDocument>): Promise<UserDocument>;
    changePassword(id: string, req: {
        user: UserDocument;
    }, body: {
        oldPassword: string;
        newPassword: string;
    }): Promise<void>;
}
